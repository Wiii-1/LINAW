# Findings: Network Provisioning / Channel Creation

## Context

The current backend implementation uses a single `networkOrchestrator` module to handle the entire Hyperledger Fabric network provisioning flow, from workspace creation to channel creation and peer joins. This “god” orchestrator runs all major steps in one `provision(userId, config)` function, which is wired to the network creation endpoint (e.g., `POST /api/v1/networks`). [file:288][file:314]

## What works

- Workspace and directory layout:
  - Per‑user workspace is initialized.
  - A per‑network workspace is created under the user workspace.
  - `crypto-config` and `channel-artifacts` subdirectories are created. [file:288]
- Configuration generation:
  - `configtx.yaml` and `docker-compose.yml` are generated based on the provided config using `configGenerator`. [file:288][file:293]
- Container orchestration:
  - Certificate Authority containers (TLS CA and org/orderer CAs) are started via `composeUpCA`.
  - Docker Compose is used to bring up the orderer and peer stack via `composeUp`. [file:288][file:292]
- Health checks and crypto:
  - TLS-CA health is checked using `curl` inside the Compose network before running `fabric-ca-client`.
  - `cryptoMaterialGenerator` is invoked to generate certificates and MSP structure.
  - `configtxgen` is used to generate the genesis block and channel transaction artifacts. [file:288][file:290][file:297]

These steps mean that, up to the point where containers are running and artifacts exist, the network bootstrap is mostly functional.

## What is fragile / blocking

- Channel orchestration is tightly coupled:
  - `networkOrchestrator` directly imports and calls `createChannel`, `joinPeersToChannel`, and `updateAnchorPeers` from `channelOrchestrator`. [file:288][file:289]
  - These calls happen as part of the same `provision` flow, after containers and artifacts are created, rather than being a separate, optional step.
- All‑or‑nothing error behavior:
  - If `createChannel` or related channel steps fail (for example, due to orderer connectivity issues from inside the container network), the entire `provision` function throws.
  - Because `provision` is bound to the network creation endpoint, a failure in channel creation surfaces as a full endpoint failure, even when CAs, crypto, and containers were successfully set up. [file:288][file:314]
- Single “god file” responsibility:
  - `networkOrchestrator` is responsible for:
    - Workspace and state file management
    - Port allocation
    - Config generation
    - Docker Compose lifecycle (CA + orderer + peers)
    - Health checks
    - Crypto material generation
    - Channel creation, peer join, and anchor peer updates
  - This lack of separation makes partial success handling (e.g., “network up but channel failed”) difficult without modifying this central file. [file:288]

In practice, this design means that when `createChannel` is unstable, backend development on other concerns (API design, tests, error handling) is repeatedly blocked by the same failure point.

## Current status

- The backend network provisioning flow is **not yet in a finished or stable state** from an API perspective:
  - There is no clear differentiation between “network provisioned, channel failed” and “network provision failed early”.
  - The endpoint does not reliably return structured status information about which steps succeeded vs failed.
- Channel creation remains a key unresolved issue:
  - The code attempts to create and configure the channel as part of the main provisioning workflow.
  - Failures here are currently treated as fatal for the entire operation. [file:288][file:289]

Because of this, other backend tasks still need attention:

- Refactoring or at least wrapping the channel orchestration section so that:
  - Network provisioning can succeed and return useful metadata even if channel creation fails.
  - Channel-related errors are captured and surfaced in a structured way (e.g., `channelCreated: false`, `channelError: "..."`).
- Cleaning up and stabilizing:
  - Error handling and logging around the provisioning flow.
  - The service layer and controller responses that expose provisioning results to the API.
  - Tests for the happy path and for partial‑success scenarios.

## Proposed direction (high level)

- Keep using `networkOrchestrator` for now, but:
  - Wrap the channel orchestration calls (`createChannel` / `joinPeersToChannel` / `updateAnchorPeers`) in one `try/catch` and record status instead of failing the entire `provision` call.
  - Make `provision` return a structured result that includes at least:
    - `network_id`, `workspace`, `config` summary
    - `channelId`
    - `channelCreated` (boolean)
    - `channelError` (string or null)
- Update the service and controller layers to:
  - Return this orchestration result (including partial success) from the network creation endpoint.
  - Clearly communicate that the network may be up even if channel creation failed.

At this point, the backend is still **in progress** and more work is required to properly handle partial success, stabilize channel orchestration, and finish surrounding API behavior and tests.