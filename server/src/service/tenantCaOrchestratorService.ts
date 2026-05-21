import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { fileURLToPath } from "url";
import { FabricCaApiClient } from "./fabricCaApiClient.js";
import forge from "node-forge";

const SERVICE_DIR = fileURLToPath(new URL(".", import.meta.url));
const SERVER_ROOT = join(SERVICE_DIR, "..", "..");
const TENANTS_DIR = process.env["TENANTS_DIR"] || join(SERVER_ROOT, "tenants");
const COMPOSE_CMD = process.env["COMPOSE_CMD"] || "docker compose";

export interface TenantCAConfig {
  tenantId: string;
  tenantName: string;
  tlsCaName: string;
  orgCaName: string;
  tlsCaPort: number;
  orgCaPort: number;
  tlsCaOpsPort: number;
  orgCaOpsPort: number;
  tlsAdminUser: string;
  tlsAdminPassword: string;
  orgAdminUser: string;
  orgAdminPassword: string;
  containerNetworkName: string;
}

export interface TenantCAStatus {
  tenantId: string;
  tlsCaUrl: string;
  orgCaUrl: string;
  tlsCertPem: string;
  tlsAdminUser: string;
  orgAdminUser: string;
  status: "initializing" | "ready" | "error";
  errorMessage?: string;
}

/**
 * Tenant CA Orchestrator — manages lifecycle of tenant CA containers
 */
export class TenantCaOrchestrator {
  /**
   * Initialize tenants directory
   */
  init(): void {
    if (!existsSync(TENANTS_DIR)) {
      mkdirSync(TENANTS_DIR, { recursive: true });
    }
  }

  /**
   * Generate Docker Compose file for tenant from template
   */
  private generateComposeFile(
    config: TenantCAConfig,
    templatePath: string,
  ): string {
    let template = readFileSync(templatePath, "utf-8");

    template = template.replace(/{TENANT_ID}/g, config.tenantId);
    template = template.replace(/{TENANT_NAME}/g, config.tenantName);
    template = template.replace(/{TLS_CA_NAME}/g, config.tlsCaName);
    template = template.replace(/{ORG_CA_NAME}/g, config.orgCaName);
    template = template.replace(/{TLS_CA_PORT}/g, config.tlsCaPort.toString());
    template = template.replace(/{ORG_CA_PORT}/g, config.orgCaPort.toString());
    template = template.replace(
      /{TLS_CA_OPS_PORT}/g,
      config.tlsCaOpsPort.toString(),
    );
    template = template.replace(
      /{ORG_CA_OPS_PORT}/g,
      config.orgCaOpsPort.toString(),
    );
    template = template.replace(/{TLS_ADMIN_USER}/g, config.tlsAdminUser);
    template = template.replace(
      /{TLS_ADMIN_PASSWORD}/g,
      config.tlsAdminPassword,
    );
    template = template.replace(/{ORG_ADMIN_USER}/g, config.orgAdminUser);
    template = template.replace(
      /{ORG_ADMIN_PASSWORD}/g,
      config.orgAdminPassword,
    );
    const hostUid = process.getuid?.() ?? 0;
    const hostGid = process.getgid?.() ?? 0;
    template = template.replace(/{HOST_UID}/g, hostUid.toString());
    template = template.replace(/{HOST_GID}/g, hostGid.toString());

    const composePath = join(TENANTS_DIR, `compose-${config.tenantId}.yml`);
    writeFileSync(composePath, template);

    return composePath;
  }

  /**
   * Start tenant CA containers
   */
  async startTenantCA(
    config: TenantCAConfig,
    templatePath: string,
  ): Promise<void> {
    try {
      const composePath = this.generateComposeFile(config, templatePath);
      const workDir = TENANTS_DIR;

      // Ensure host directories for persistent CA data exist (volumes mounted in compose)
      const tenantDir = join(TENANTS_DIR, config.tenantId);
      const tlsDir = join(tenantDir, "tls-ca");
      const orgDir = join(tenantDir, "org-ca");
      const orgClientDir = join(tenantDir, "org-ca-client");

      if (!existsSync(tenantDir)) mkdirSync(tenantDir, { recursive: true });
      if (!existsSync(tlsDir)) mkdirSync(tlsDir, { recursive: true });
      if (!existsSync(orgDir)) mkdirSync(orgDir, { recursive: true });
      if (!existsSync(orgClientDir))
        mkdirSync(orgClientDir, { recursive: true });

      // Execute: docker compose -f compose-{tenantId}.yml up -d
      const cmd = `${COMPOSE_CMD} -f ${composePath} up -d`;
      console.log(`[${config.tenantId}] Starting containers: ${cmd}`);

      execSync(cmd, { cwd: workDir, stdio: "inherit" });

      // Wait for health checks
      await this.waitForCAHealthy(config.tlsCaPort, 30);
      await this.waitForCAHealthy(config.orgCaPort, 30);

      console.log(`[${config.tenantId}] Containers started and healthy`);
    } catch (error) {
      try {
        await this.stopTenantCA(config.tenantId);
      } catch (cleanupError) {
        console.error(
          `[${config.tenantId}] Rollback after failed start:`,
          cleanupError,
        );
      }
      throw new Error(
        `Failed to start tenant CA: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Poll CA health endpoint until ready or timeout
   */
  private async waitForCAHealthy(
    port: number,
    maxRetries: number,
  ): Promise<void> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const client = new FabricCaApiClient(`localhost:${port}`);
        await client.getCAInfo();
        return;
      } catch {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error(
      `CA on port ${port} did not become healthy after ${maxRetries}s`,
    );
  }

  /**
   * Initialize Tenant CAs via API: enroll bootstrap admins
   */
  async initializeTenantCAs(config: TenantCAConfig): Promise<{
    tlsCertPem: string;
    orgCertPem: string;
    tlsPrivateKey: string;
    orgPrivateKey: string;
  }> {
    const tlsClient = new FabricCaApiClient(`localhost:${config.tlsCaPort}`);
    const orgClient = new FabricCaApiClient(`localhost:${config.orgCaPort}`);

    // Generate valid PKCS#10 CSRs and matching private keys for admin enrollments.
    const tlsIdentity = this.generateEnrollmentCSR(config.tlsAdminUser);
    const orgIdentity = this.generateEnrollmentCSR(config.orgAdminUser);

    try {
      console.log(`[${config.tenantId}] Enrolling TLS CA admin...`);
      const tlsEnrollRes = await tlsClient.enroll(
        config.tlsAdminUser,
        config.tlsAdminPassword,
        tlsIdentity.csrPem,
        config.tlsCaName,
      );

      if (!tlsEnrollRes.success || !tlsEnrollRes.result?.Cert) {
        throw new Error(
          `TLS CA enroll failed: ${JSON.stringify(tlsEnrollRes.errors)}`,
        );
      }

      const tlsCertPem = Buffer.from(
        tlsEnrollRes.result.Cert,
        "base64",
      ).toString("utf-8");

      console.log(`[${config.tenantId}] Enrolling Org CA admin...`);
      const orgEnrollRes = await orgClient.enroll(
        config.orgAdminUser,
        config.orgAdminPassword,
        orgIdentity.csrPem,
        config.orgCaName,
      );

      if (!orgEnrollRes.success || !orgEnrollRes.result?.Cert) {
        throw new Error(
          `Org CA enroll failed: ${JSON.stringify(orgEnrollRes.errors)}`,
        );
      }

      const orgCertPem = Buffer.from(
        orgEnrollRes.result.Cert,
        "base64",
      ).toString("utf-8");

      return {
        tlsCertPem,
        orgCertPem,
        tlsPrivateKey: tlsIdentity.privateKeyPem,
        orgPrivateKey: orgIdentity.privateKeyPem,
      };
    } catch (error) {
      throw new Error(
        `Failed to initialize tenant CAs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Stop and remove tenant CA containers
   */
  async stopTenantCA(tenantId: string): Promise<void> {
    try {
      const composePath = join(TENANTS_DIR, `compose-${tenantId}.yml`);

      if (existsSync(composePath)) {
        const cmd = `${COMPOSE_CMD} -f ${composePath} down -v`;
        console.log(`[${tenantId}] Stopping containers: ${cmd}`);
        execSync(cmd, { cwd: TENANTS_DIR, stdio: "inherit" });

        // Remove compose file and tenant directory
        rmSync(composePath);
      }

      this.forceStopTenantContainers(tenantId);
      this.removeTenantDirectory(tenantId);

      console.log(`[${tenantId}] Containers stopped and cleaned up`);
    } catch (error) {
      throw new Error(
        `Failed to stop tenant CA: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Stop CA containers by name when compose metadata is missing or incomplete.
   */
  private forceStopTenantContainers(tenantId: string): void {
    const safeTenantId = basename(tenantId);
    if (safeTenantId !== tenantId || tenantId.includes("..")) {
      return;
    }

    for (const containerName of [
      `tls-ca-${safeTenantId}`,
      `org-ca-${safeTenantId}`,
    ]) {
      try {
        execSync(`docker rm -f ${containerName}`, { stdio: "ignore" });
      } catch {
        // Container may not exist
      }
    }
  }

  /**
   * Remove CA containers for tenants that are no longer tracked (e.g. after server restart).
   */
  cleanupStaleCaContainers(activeTenantIds: Set<string>): void {
    try {
      const output = execSync(
        'docker ps -aq --filter "label=service=hyperledger-fabric"',
        { encoding: "utf-8" },
      );
      const containerIds = output
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      for (const containerId of containerIds) {
        let tenantLabel = "";
        try {
          tenantLabel = execSync(
            `docker inspect -f '{{index .Config.Labels "tenant"}}' ${containerId}`,
            { encoding: "utf-8" },
          ).trim();
        } catch {
          continue;
        }

        if (!tenantLabel || activeTenantIds.has(tenantLabel)) {
          continue;
        }

        console.log(
          `[cleanup] Removing stale CA container ${containerId} (tenant=${tenantLabel})`,
        );
        try {
          execSync(`docker rm -f ${containerId}`, { stdio: "inherit" });
        } catch (error) {
          console.error(
            `[cleanup] Failed to remove container ${containerId}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("[cleanup] Failed to list stale CA containers:", error);
    }
  }

  /**
   * Remove tenant data directory. Docker bind mounts may leave root-owned files.
   */
  private removeTenantDirectory(tenantId: string): void {
    const safeTenantId = basename(tenantId);
    if (safeTenantId !== tenantId || tenantId.includes("..")) {
      throw new Error(`Invalid tenant id: ${tenantId}`);
    }

    const tenantDir = join(TENANTS_DIR, safeTenantId);
    if (!existsSync(tenantDir)) {
      return;
    }

    try {
      rmSync(tenantDir, { recursive: true, force: true });
      return;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "EACCES" && err.code !== "EPERM") {
        throw error;
      }
    }

    console.log(
      `[${tenantId}] Removing root-owned tenant directory via Docker...`,
    );
    const cmd = `docker run --rm -v "${TENANTS_DIR}:/tenants:rw" alpine rm -rf "/tenants/${safeTenantId}"`;
    try {
      execSync(cmd, { stdio: "inherit" });
    } catch (error) {
      throw new Error(
        `Could not remove tenant data; root-owned files may remain at ${tenantDir}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (existsSync(tenantDir)) {
      throw new Error(
        `Could not remove tenant data; root-owned files remain at ${tenantDir}`,
      );
    }
  }

  /**
   * Get tenant CA containers status
   */
  async getContainerStatus(tenantId: string): Promise<{
    tlsContainer: string | null;
    orgContainer: string | null;
  }> {
    try {
      const cmd = `docker ps -a --filter "label=tenant=${tenantId}" --format "table {{.Names}}\t{{.State}}"`;
      const output = execSync(cmd, { encoding: "utf-8" });

      const lines = output.split("\n").filter((line) => line.trim().length > 0);
      let tlsContainer = null;
      let orgContainer = null;

      for (const line of lines) {
        if (line.includes(`tls-ca-${tenantId}`))
          tlsContainer = line.split("\t")[0] ?? null;
        if (line.includes(`org-ca-${tenantId}`))
          orgContainer = line.split("\t")[0] ?? null;
      }

      return { tlsContainer, orgContainer };
    } catch {
      return { tlsContainer: null, orgContainer: null };
    }
  }

  /**
   * Generate a valid PKCS#10 CSR and return its matching private key.
   */
  private generateEnrollmentCSR(commonName: string): {
    csrPem: string;
    privateKeyPem: string;
  } {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const csr = forge.pki.createCertificationRequest();

    csr.publicKey = keys.publicKey;
    csr.setSubject([
      {
        name: "commonName",
        value: commonName,
      },
    ]);
    csr.sign(keys.privateKey, forge.md.sha256.create());

    if (!csr.verify()) {
      throw new Error(`Generated CSR verification failed for ${commonName}`);
    }

    return {
      csrPem: forge.pki.certificationRequestToPem(csr),
      privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    };
  }
}
