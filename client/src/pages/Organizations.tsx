import { AppSidebar } from "@/components/app-sidebar"
import { OnboardingStepCard } from "@/components/organizations/onboarding-step-card"
import { OrgStatusSummary } from "@/components/organizations/org-status-summary"
import { PageHero } from "@/components/page-hero"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  createRootCa,
  deleteFabricOrg,
  deleteRootCa,
  downloadTlsCert,
  fetchOnboardingStatus,
  provisionOrdererOrg,
  provisionPeerOrg,
  suggestDomain,
  suggestMspId,
  type OnboardingStatus,
  type ProvisionFabricOrgPayload,
} from "@/services/tenantOnboardingService"
import { Download, Plus, Trash2 } from "lucide-react"
import { type CSSProperties, useCallback, useEffect, useState } from "react"

const INVALID_CHARACTER_RULES = [
  { character: ":", label: "colon" },
  { character: "@", label: "at sign" },
  { character: "/", label: "forward slash" },
  { character: ";", label: "semicolon" },
  { character: "&", label: "ampersand" },
  { character: "|", label: "pipe" },
  { character: "`", label: "backtick" },
  { character: "$", label: "dollar sign" },
  { character: "(", label: "left parenthesis" },
  { character: ")", label: "right parenthesis" },
  { character: "\\", label: "backslash" },
  { character: '"', label: "double quote" },
  { character: "'", label: "single quote" },
  { character: " ", label: "space" },
] as const

function getInvalidCharacters(value: string): string[] {
  const invalidCharacters = new Set<string>()
  for (const rule of INVALID_CHARACTER_RULES) {
    if (value.includes(rule.character)) invalidCharacters.add(rule.label)
  }
  if (/\t/.test(value)) invalidCharacters.add("tab")
  if (/\n|\r/.test(value)) invalidCharacters.add("newline")
  return [...invalidCharacters]
}

function getInputValidationMessage(value: string): string | null {
  if (!value || value.length === 0) return "required"
  if (value.startsWith("-")) return "must not start with '-'"
  const invalidCharacters = getInvalidCharacters(value)
  if (invalidCharacters.length > 0) {
    return `Contains invalid characters: ${invalidCharacters.join(", ")}`
  }
  return null
}

function FabricOrgForm({
  title,
  submitLabel,
  disabled,
  loading,
  onSubmit,
}: {
  title: string
  submitLabel: string
  disabled?: boolean
  loading?: boolean
  onSubmit: (payload: ProvisionFabricOrgPayload) => Promise<void>
}) {
  const [organizationName, setOrganizationName] = useState("")
  const [mspId, setMspId] = useState("")
  const [domain, setDomain] = useState("")
  const [adminUser, setAdminUser] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [mspTouched, setMspTouched] = useState(false)
  const [domainTouched, setDomainTouched] = useState(false)

  useEffect(() => {
    if (!organizationName) return
    if (!mspTouched) setMspId(suggestMspId(organizationName))
    if (!domainTouched) setDomain(suggestDomain(organizationName))
  }, [organizationName, mspTouched, domainTouched])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const fields = [
      { v: organizationName, name: "Organization name" },
      { v: mspId, name: "MSP ID" },
      { v: domain, name: "Domain" },
      { v: adminUser, name: "Admin username" },
      { v: adminPassword, name: "Admin password" },
    ]

    for (const f of fields) {
      const bad = getInputValidationMessage(f.v)
      if (bad) {
        setError(`${f.name} ${bad}`)
        return
      }
    }

    try {
      await onSubmit({
        organizationName,
        mspId,
        domain,
        adminUser,
        adminPassword,
      })
      setOrganizationName("")
      setMspId("")
      setDomain("")
      setAdminUser("")
      setAdminPassword("")
      setMspTouched(false)
      setDomainTouched(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">{title}</p>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <FieldGroup className="gap-4">
        <Field className="space-y-2">
          <Label htmlFor={`${submitLabel}-orgName`}>Organization name</Label>
          <Input
            id={`${submitLabel}-orgName`}
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            disabled={disabled || loading}
            required
          />
        </Field>
        <Field className="space-y-2">
          <Label htmlFor={`${submitLabel}-mspId`}>MSP ID</Label>
          <Input
            id={`${submitLabel}-mspId`}
            value={mspId}
            onChange={(e) => {
              setMspTouched(true)
              setMspId(e.target.value)
            }}
            disabled={disabled || loading}
            required
          />
        </Field>
        <Field className="space-y-2">
          <Label htmlFor={`${submitLabel}-domain`}>Domain</Label>
          <Input
            id={`${submitLabel}-domain`}
            value={domain}
            onChange={(e) => {
              setDomainTouched(true)
              setDomain(e.target.value)
            }}
            disabled={disabled || loading}
            required
          />
        </Field>
        <Field className="space-y-2">
          <Label htmlFor={`${submitLabel}-adminUser`}>Admin username</Label>
          <Input
            id={`${submitLabel}-adminUser`}
            value={adminUser}
            onChange={(e) => setAdminUser(e.target.value)}
            disabled={disabled || loading}
            required
          />
          <FieldDescription>
            Must differ from your root CA admin username (e.g. use peeradmin, not
            the same name as org CA bootstrap).
          </FieldDescription>
        </Field>
        <Field className="space-y-2">
          <Label htmlFor={`${submitLabel}-adminPassword`}>Admin password</Label>
          <PasswordInput
            id={`${submitLabel}-adminPassword`}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            disabled={disabled || loading}
            required
          />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={disabled || loading}>
        {loading ? "Provisioning..." : submitLabel}
      </Button>
    </form>
  )
}

export default function Organizations() {
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [caDialogOpen, setCaDialogOpen] = useState(false)
  const [caLoading, setCaLoading] = useState(false)
  const [peerLoading, setPeerLoading] = useState(false)
  const [ordererLoading, setOrdererLoading] = useState(false)
  const [caError, setCaError] = useState<string | null>(null)

  const [tenantName, setTenantName] = useState("")
  const [tlsAdminUser, setTlsAdminUser] = useState("")
  const [tlsAdminPassword, setTlsAdminPassword] = useState("")
  const [orgAdminUser, setOrgAdminUser] = useState("")
  const [orgAdminPassword, setOrgAdminPassword] = useState("")

  const loadStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const status = await fetchOnboardingStatus()
      setOnboarding(status)
    } catch (err) {
      console.error("Failed to load onboarding status:", err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    const interval = setInterval(() => {
      void loadStatus(true)
    }, 5000)
    return () => clearInterval(interval)
  }, [loadStatus])

  const rootCa = onboarding?.rootCa ?? null
  const peerOrg = onboarding?.peerOrg ?? null
  const ordererOrg = onboarding?.ordererOrg ?? null
  const rootCaReady = rootCa?.status === "ready"
  const hasRootCa = Boolean(rootCa)

  async function handleCreateCa(e: React.FormEvent) {
    e.preventDefault()
    setCaError(null)

    const fields = [
      { v: tenantName, name: "Tenant name" },
      { v: tlsAdminUser, name: "TLS admin username" },
      { v: tlsAdminPassword, name: "TLS admin password" },
      { v: orgAdminUser, name: "Org admin username" },
      { v: orgAdminPassword, name: "Org admin password" },
    ]

    for (const f of fields) {
      const bad = getInputValidationMessage(f.v)
      if (bad) {
        setCaError(`${f.name} ${bad}`)
        return
      }
    }

    setCaLoading(true)
    try {
      await createRootCa({
        tenantName,
        tlsAdminUser,
        tlsAdminPassword,
        orgAdminUser,
        orgAdminPassword,
      })
      setTenantName("")
      setTlsAdminUser("")
      setTlsAdminPassword("")
      setOrgAdminUser("")
      setOrgAdminPassword("")
      setCaDialogOpen(false)
      await loadStatus(true)
    } catch (err) {
      setCaError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setCaLoading(false)
    }
  }

  async function handleDeleteCa() {
    if (!rootCa) return
    if (
      !window.confirm(
        "Delete your root CA and all peer/orderer organizations? This cannot be undone."
      )
    ) {
      return
    }
    try {
      await deleteRootCa(rootCa.tenantId)
      await loadStatus(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Organizations" />
        <main className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <PageHero
            title="Organizations"
            description="Onboard your Hyperledger Fabric root CA, peer, and orderer. Each tenant has one root CA that issues credentials for both organizations."
            actions={
              !hasRootCa ? (
                <Dialog open={caDialogOpen} onOpenChange={setCaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      className="bg-white text-slate-950 hover:bg-white/90"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Provision root CA
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCreateCa} noValidate>
                      <DialogHeader>
                        <DialogTitle className="text-center">
                          Provision root certificate authority
                        </DialogTitle>
                        <DialogDescription className="text-center">
                          One root TLS CA and one org signing CA per tenant
                        </DialogDescription>
                      </DialogHeader>
                      {caError ? (
                        <div className="max-h-28 overflow-y-auto rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {caError}
                        </div>
                      ) : null}
                      <FieldGroup className="gap-4 py-4">
                        <Field className="space-y-2">
                          <Label htmlFor="tenantName">Tenant name</Label>
                          <Input
                            id="tenantName"
                            value={tenantName}
                            onChange={(e) => setTenantName(e.target.value)}
                            required
                          />
                        </Field>
                        <div className="border-t pt-4">
                          <Field className="mb-3 space-y-2">
                            <Label htmlFor="tlsAdminUser">TLS admin username</Label>
                            <Input
                              id="tlsAdminUser"
                              value={tlsAdminUser}
                              onChange={(e) => setTlsAdminUser(e.target.value)}
                              required
                            />
                          </Field>
                          <Field className="space-y-2">
                            <Label htmlFor="tlsAdminPassword">TLS admin password</Label>
                            <PasswordInput
                              id="tlsAdminPassword"
                              value={tlsAdminPassword}
                              onChange={(e) => setTlsAdminPassword(e.target.value)}
                              required
                            />
                          </Field>
                        </div>
                        <div className="border-t pt-4">
                          <Field className="mb-3 space-y-2">
                            <Label htmlFor="orgAdminUser">Org admin username</Label>
                            <Input
                              id="orgAdminUser"
                              value={orgAdminUser}
                              onChange={(e) => setOrgAdminUser(e.target.value)}
                              required
                            />
                          </Field>
                          <Field className="space-y-2">
                            <Label htmlFor="orgAdminPassword">Org admin password</Label>
                            <PasswordInput
                              id="orgAdminPassword"
                              value={orgAdminPassword}
                              onChange={(e) => setOrgAdminPassword(e.target.value)}
                              required
                            />
                          </Field>
                        </div>
                      </FieldGroup>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="destructive" className="sm:mr-auto">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button type="submit" disabled={caLoading}>
                          {caLoading ? "Provisioning..." : "Provision root CA"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null
            }
          />

          {loading && !onboarding ? (
            <p className="text-sm text-muted-foreground">Loading onboarding status...</p>
          ) : null}

          <div className="flex flex-col gap-6">
            <OnboardingStepCard
              step={1}
              title="Root certificate authority"
              description="Your tenant's single root TLS and org signing CA. Required before peer or orderer onboarding."
            >
              {!hasRootCa ? (
                <p className="text-sm text-muted-foreground">
                  No root CA provisioned yet. Use the button above to create one.
                </p>
              ) : (
                <div className="space-y-4">
                  <OrgStatusSummary
                    status={rootCa!.status}
                    errorMessage={rootCa!.errorMessage}
                    rows={[
                      { label: "Tenant", value: rootCa!.tenantName },
                      { label: "TLS CA", value: rootCa!.tlsCaName },
                      { label: "Org CA", value: rootCa!.orgCaName },
                      {
                        label: "Created",
                        value: new Date(rootCa!.createdAt).toLocaleString(),
                      },
                    ]}
                  />
                  <div className="flex flex-wrap gap-2">
                    {rootCaReady ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTlsCert(rootCa!.tenantId)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download TLS cert
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteCa}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete root CA
                    </Button>
                  </div>
                </div>
              )}
            </OnboardingStepCard>

            <OnboardingStepCard
              step={2}
              title="Peer organization"
              description="One peer node with CouchDB state database, enrolled via your root CA."
              locked={!rootCaReady}
            >
              {!rootCaReady ? (
                <p className="text-sm text-muted-foreground">
                  Complete root CA provisioning first.
                </p>
              ) : peerOrg ? (
                <div className="space-y-4">
                  <OrgStatusSummary
                    status={peerOrg.status}
                    errorMessage={peerOrg.errorMessage}
                    rows={[
                      { label: "Organization", value: peerOrg.organizationName },
                      { label: "MSP ID", value: peerOrg.mspId },
                      { label: "Domain", value: peerOrg.domain },
                      ...(peerOrg.peerPort
                        ? [{ label: "Peer port", value: String(peerOrg.peerPort) }]
                        : []),
                    ]}
                  />
                  {peerOrg.status !== "initializing" ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (!window.confirm("Remove peer organization?")) return
                        try {
                          await deleteFabricOrg("peer")
                          await loadStatus(true)
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Delete failed")
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove peer org
                    </Button>
                  ) : null}
                </div>
              ) : (
                <FabricOrgForm
                  title="Peer uses CouchDB for world state. Credentials are issued by your org CA."
                  submitLabel="Provision peer organization"
                  loading={peerLoading}
                  disabled={!onboarding?.canProvisionPeer}
                  onSubmit={async (payload) => {
                    setPeerLoading(true)
                    try {
                      await provisionPeerOrg(payload)
                      await loadStatus(true)
                    } finally {
                      setPeerLoading(false)
                    }
                  }}
                />
              )}
            </OnboardingStepCard>

            <OnboardingStepCard
              step={3}
              title="Orderer organization"
              description="One tenant-hosted orderer node, enrolled via your root CA."
              locked={!rootCaReady}
            >
              {!rootCaReady ? (
                <p className="text-sm text-muted-foreground">
                  Complete root CA provisioning first.
                </p>
              ) : ordererOrg ? (
                <div className="space-y-4">
                  <OrgStatusSummary
                    status={ordererOrg.status}
                    errorMessage={ordererOrg.errorMessage}
                    rows={[
                      { label: "Organization", value: ordererOrg.organizationName },
                      { label: "MSP ID", value: ordererOrg.mspId },
                      { label: "Domain", value: ordererOrg.domain },
                      ...(ordererOrg.ordererPort
                        ? [{ label: "Orderer port", value: String(ordererOrg.ordererPort) }]
                        : []),
                    ]}
                  />
                  {ordererOrg.status !== "initializing" ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (!window.confirm("Remove orderer organization?")) return
                        try {
                          await deleteFabricOrg("orderer")
                          await loadStatus(true)
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Delete failed")
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove orderer org
                    </Button>
                  ) : null}
                </div>
              ) : (
                <FabricOrgForm
                  title="Orderer runs with a bootstrap genesis block containing only the orderer MSP."
                  submitLabel="Provision orderer organization"
                  loading={ordererLoading}
                  disabled={!onboarding?.canProvisionOrderer}
                  onSubmit={async (payload) => {
                    setOrdererLoading(true)
                    try {
                      await provisionOrdererOrg(payload)
                      await loadStatus(true)
                    } finally {
                      setOrdererLoading(false)
                    }
                  }}
                />
              )}
            </OnboardingStepCard>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
