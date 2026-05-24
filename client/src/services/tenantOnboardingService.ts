import { authHeaders, mapTenantApiError } from "@/lib/authToken"

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"

export type DeploymentStatus = "initializing" | "ready" | "error"

export interface RootCaStatus {
  tenantId: string
  tenantName: string
  tlsCaName: string
  orgCaName: string
  status: DeploymentStatus
  createdAt: string
  errorMessage?: string
}

export interface FabricOrgStatus {
  fabricOrgId: string
  tenantId: string
  orgType: "peer" | "orderer"
  organizationName: string
  mspId: string
  domain: string
  peerPort?: number
  chaincodePort?: number
  couchdbPort?: number
  ordererPort?: number
  ordererAdminPort?: number
  operationsPort?: number
  status: DeploymentStatus
  errorMessage?: string
  createdAt: string
}

export interface OnboardingStatus {
  rootCa: RootCaStatus | null
  peerOrg: FabricOrgStatus | null
  ordererOrg: FabricOrgStatus | null
  canProvisionPeer: boolean
  canProvisionOrderer: boolean
}

export interface CreateRootCaPayload {
  tenantName: string
  tlsAdminUser: string
  tlsAdminPassword: string
  orgAdminUser: string
  orgAdminPassword: string
}

export interface ProvisionFabricOrgPayload {
  organizationName: string
  mspId: string
  domain: string
  adminUser: string
  adminPassword: string
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json()
    if (payload?.error && typeof payload.error === "object" && payload.error.message) {
      return mapTenantApiError(response.status, payload.error.message)
    }
    if (typeof payload?.error === "string") {
      return mapTenantApiError(response.status, payload.error)
    }
  } catch {
    // ignore
  }
  return mapTenantApiError(response.status, response.statusText)
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus | null> {
  const headers = await authHeaders()
  const response = await fetch(`${backendUrl}/api/tenants/onboarding`, { headers })
  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  return (await response.json()) as OnboardingStatus
}

export async function createRootCa(
  payload: CreateRootCaPayload
): Promise<void> {
  const headers = await authHeaders({ "Content-Type": "application/json" })
  const response = await fetch(`${backendUrl}/api/tenants`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function deleteRootCa(tenantId: string): Promise<void> {
  const headers = await authHeaders()
  const response = await fetch(`${backendUrl}/api/tenants/${tenantId}`, {
    method: "DELETE",
    headers,
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function downloadTlsCert(tenantId: string): Promise<void> {
  const headers = await authHeaders()
  const response = await fetch(`${backendUrl}/api/tenants/${tenantId}/tls-cert`, {
    headers,
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  const pem = await response.text()
  const blob = new Blob([pem], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `tls-ca-${tenantId}.pem`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function provisionPeerOrg(
  payload: ProvisionFabricOrgPayload
): Promise<void> {
  const headers = await authHeaders({ "Content-Type": "application/json" })
  const response = await fetch(`${backendUrl}/api/tenants/fabric-orgs/peer`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function provisionOrdererOrg(
  payload: ProvisionFabricOrgPayload
): Promise<void> {
  const headers = await authHeaders({ "Content-Type": "application/json" })
  const response = await fetch(`${backendUrl}/api/tenants/fabric-orgs/orderer`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function deleteFabricOrg(orgType: "peer" | "orderer"): Promise<void> {
  const headers = await authHeaders()
  const response = await fetch(`${backendUrl}/api/tenants/fabric-orgs/${orgType}`, {
    method: "DELETE",
    headers,
  })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export function suggestMspId(organizationName: string): string {
  const slug = organizationName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "")
  if (!slug) return "OrgMSP"
  return `${slug.charAt(0).toUpperCase()}${slug.slice(1)}MSP`
}

export function suggestDomain(organizationName: string): string {
  const slug = organizationName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug ? `${slug}.tenant.local` : "org.tenant.local"
}
