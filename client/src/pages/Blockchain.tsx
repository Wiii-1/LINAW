import { AppSidebar } from "@/components/app-sidebar"
import { PageHero } from "@/components/page-hero"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useEffect, useState, type CSSProperties } from "react"
import { getAuth } from "firebase/auth"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

interface Network {
  network_id: number
  network_name: string
  status: "active" | "starting" | "stopped"
  organizations: string[]
  consensus: "etcdraft" | "solo"
  channelId: string
  ordererCount: number
  created_at: string
}

const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  starting: { label: "Starting", color: "bg-yellow-100 text-yellow-800" },
  stopped: { label: "Stopped", color: "bg-gray-100 text-gray-800" },
}

const normalizeStatus = (status: unknown): Network["status"] => {
  if (status === "active" || status === "starting" || status === "stopped") {
    return status
  }
  return "starting"
}

const normalizeConsensus = (consensus: unknown): Network["consensus"] => {
  if (consensus === "solo" || consensus === "etcdraft") {
    return consensus
  }
  return "etcdraft"
}

const mapOrganizations = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((org) => {
      if (typeof org === "string") return org
      if (org && typeof org === "object") {
        const orgRecord = org as Record<string, unknown>
        const name = orgRecord.name ?? orgRecord.orgName ?? orgRecord.organization_name
        return typeof name === "string" ? name : ""
      }
      return ""
    })
    .filter((org) => org.trim().length > 0)
}

const toNetwork = (
  value: unknown,
  fallbackId: number,
  fallback?: Partial<Network>
): Network => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  const rawId = record.network_id ?? record.id ?? fallback?.network_id ?? fallbackId
  const parsedId = typeof rawId === "number" ? rawId : Number.parseInt(String(rawId), 10)
  const networkId = Number.isFinite(parsedId) ? parsedId : fallbackId

  const networkName =
    (typeof record.network_name === "string" && record.network_name) ||
    (typeof record.name === "string" && record.name) ||
    fallback?.network_name ||
    `network-${networkId}`

  const organizations = mapOrganizations(record.organizations ?? record.orgs)
  const consensus = normalizeConsensus(
    record.consensus ?? (record.config as Record<string, unknown> | undefined)?.consensus ?? fallback?.consensus
  )
  const channelId =
    (typeof record.channelId === "string" && record.channelId) ||
    (typeof record.channel_id === "string" && record.channel_id) ||
    (typeof (record.config as Record<string, unknown> | undefined)?.channelId === "string" &&
      ((record.config as Record<string, unknown>).channelId as string)) ||
    fallback?.channelId ||
    "mychannel"

  const ordererCandidate =
    record.ordererCount ??
    record.orderer_count ??
    (record.config as Record<string, unknown> | undefined)?.ordererCount ??
    fallback?.ordererCount ??
    1
  const parsedOrdererCount =
    typeof ordererCandidate === "number"
      ? ordererCandidate
      : Number.parseInt(String(ordererCandidate), 10)

  return {
    network_id: networkId,
    network_name: networkName,
    status: normalizeStatus(record.status ?? fallback?.status),
    organizations: organizations.length > 0 ? organizations : fallback?.organizations ?? [],
    consensus,
    channelId,
    ordererCount: Number.isFinite(parsedOrdererCount) ? parsedOrdererCount : 1,
    created_at:
      (typeof record.created_at === "string" && record.created_at) ||
      (typeof record.createdAt === "string" && record.createdAt) ||
      fallback?.created_at ||
      new Date().toISOString(),
  }
}

const sanitizeOrgName = (orgName: string, index: number): string => {
  const cleaned = orgName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 30)
  return cleaned.length >= 2 ? cleaned : `Org${index + 1}`
}

const toMspId = (orgName: string, index: number): string => {
  const base = sanitizeOrgName(orgName, index)
  const withSuffix = base.toUpperCase().endsWith("MSP") ? base : `${base}MSP`
  return withSuffix.slice(0, 30)
}

export default function BlockchainNetworks() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewingNetwork, setViewingNetwork] = useState<Network | null>(null)
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"

  // Form state
  const [formData, setFormData] = useState({
    networkName: "",
    consensus: "etcdraft",
    channelId: "mychannel",
    ordererCount: "3" as "1" | "3" | "5",
    organizations: [] as string[],
    orgName: "",
  })

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()

    if (!token) {
      throw new Error("Authentication required")
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }

  // Load networks on mount
  useEffect(() => {
    const loadNetworks = async () => {
      setLoading(true)
      setError(null)
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`${backendUrl}/api/v1/networks`, {
          method: "GET",
          headers,
        })

        if (!response.ok) {
          throw new Error(`Failed to load networks: ${response.statusText}`)
        }

        const payload = await response.json()
        const rawNetworks = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.networks)
            ? payload.networks
            : Array.isArray(payload)
              ? payload
              : []

        setNetworks(rawNetworks.map((network: unknown, index: number) => toNetwork(network, index + 1)))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load networks")
      } finally {
        setLoading(false)
      }
    }

    loadNetworks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddOrganization = () => {
    if (formData.orgName.trim()) {
      setFormData((prev) => ({
        ...prev,
        organizations: [...prev.organizations, prev.orgName],
        orgName: "",
      }))
    }
  }

  const handleRemoveOrganization = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      organizations: prev.organizations.filter((_, i) => i !== index),
    }))
  }

  const handleCreateNetwork = async () => {
    try {
      setError(null)
      if (!formData.networkName) {
        setError("Network name is required")
        return
      }
      if (formData.organizations.length === 0) {
        setError("At least one organization is required")
        return
      }

      const headers = await getAuthHeaders()
      const payload = {
        name: formData.networkName,
        consensus: formData.consensus,
        channelId: formData.channelId,
        ordererCount: Number.parseInt(formData.ordererCount, 10),
        orgs: formData.organizations.map((orgName, index) => ({
          name: sanitizeOrgName(orgName, index),
          msp_ID: toMspId(orgName, index),
        })),
      }

      const response = await fetch(`${backendUrl}/api/v1/networks`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Failed to create network: ${response.statusText}`)
      }

      const result = await response.json()
      const createdSource =
        result?.data ?? result?.network ?? result?.orchestration?.network ?? result

      const fallbackId = Math.max(...networks.map((n) => n.network_id), 0) + 1
      const createdNetwork = toNetwork(createdSource, fallbackId, {
        network_name: formData.networkName,
        status: "starting",
        organizations: formData.organizations,
        consensus: formData.consensus as "etcdraft" | "solo",
        channelId: formData.channelId,
        ordererCount: Number.parseInt(formData.ordererCount, 10),
        created_at: new Date().toISOString(),
      })

      setNetworks((prev) => [createdNetwork, ...prev])
      setFormData({
        networkName: "",
        consensus: "etcdraft",
        channelId: "mychannel",
        ordererCount: "3",
        organizations: [],
        orgName: "",
      })
      setIsDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create network")
    }
  }

  const handleDeleteNetwork = (networkId: number) => {
    if (!confirm("Are you sure you want to delete this network?")) return
    setNetworks((prev) => prev.filter((n) => n.network_id !== networkId))
    if (viewingNetwork?.network_id === networkId) {
      setViewingNetwork(null)
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
        <SiteHeader title="Blockchain Networks" />
        <main className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <PageHero
            title="Blockchain Networks"
            description="Manage Hyperledger Fabric networks and infrastructure"
            actions={
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-white text-slate-950 hover:bg-white/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Network
                  </Button>
                </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleCreateNetwork()
                  }}
                  noValidate
                >
                  <DialogHeader>
                    <DialogTitle>Create New Blockchain Network</DialogTitle>
                    <DialogDescription>
                      Configure and deploy a new Hyperledger Fabric network
                    </DialogDescription>
                  </DialogHeader>

                  <FieldGroup className="gap-4 py-4">
                    <Field>
                      <Label htmlFor="network-name">Network Name *</Label>
                      <Input
                        id="network-name"
                        placeholder="e.g., production-network"
                        value={formData.networkName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            networkName: e.target.value,
                          })
                        }
                      />
                      <FieldDescription>
                        3-50 alphanumeric characters
                      </FieldDescription>
                    </Field>

                    <Field>
                      <Label htmlFor="consensus">Consensus Mechanism *</Label>
                      <Select
                        value={formData.consensus}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            consensus: value as "etcdraft" | "solo",
                          })
                        }
                      >
                        <SelectTrigger id="consensus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="etcdraft">
                            etcdraft (Recommended)
                          </SelectItem>
                          <SelectItem value="solo">Solo (Dev Only)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        etcdraft for production, solo for testing
                      </FieldDescription>
                    </Field>

                    <Field>
                      <Label htmlFor="orderer-count">Orderer Count *</Label>
                      <Select
                        value={formData.ordererCount}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            ordererCount: value as "1" | "3" | "5",
                          })
                        }
                      >
                        <SelectTrigger id="orderer-count">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Orderer</SelectItem>
                          <SelectItem value="3">3 Orderers</SelectItem>
                          <SelectItem value="5">5 Orderers</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Higher count for better fault tolerance
                      </FieldDescription>
                    </Field>

                    <Field>
                      <Label htmlFor="channel-id">Channel ID *</Label>
                      <Input
                        id="channel-id"
                        placeholder="e.g., mychannel"
                        value={formData.channelId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            channelId: e.target.value,
                          })
                        }
                      />
                      <FieldDescription>Initial channel name</FieldDescription>
                    </Field>

                    <Field>
                      <Label htmlFor="org-input">Organizations *</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            id="org-input"
                            placeholder="Organization name"
                            value={formData.orgName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                orgName: e.target.value,
                              })
                            }
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleAddOrganization()
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddOrganization}
                          >
                            Add
                          </Button>
                        </div>

                        <div className="space-y-1">
                          {formData.organizations.map((org, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded bg-gray-50 p-2"
                            >
                              <span className="text-sm font-medium">{org}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveOrganization(index)}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <FieldDescription>
                        At least one organization required (e.g., Org1MSP)
                      </FieldDescription>
                    </Field>

                    {error ? (
                      <div className="max-h-28 overflow-y-auto rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm whitespace-pre-wrap text-red-700">
                        {error}
                      </div>
                    ) : null}
                  </FieldGroup>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit">Create Network</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
              </Dialog>
            }
          />

          {error && !isDialogOpen && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-lg border bg-card text-card-foreground">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Loading networks...</p>
              </div>
            ) : networks.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">No networks found</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead>Network Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Organizations</TableHead>
                    <TableHead>Consensus</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Row actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {networks.map((network) => (
                    <TableRow key={network.network_id}>
                      <TableCell className="font-medium">
                        {network.network_name}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[network.status].color}>
                          {STATUS_CONFIG[network.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {network.organizations.map((org, idx) => (
                            <Badge key={idx} variant="outline">
                              {org}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {network.consensus}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(network.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="space-x-1 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Open actions menu</span>
                              ⋯
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setViewingNetwork(network)}
                            >
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setViewingNetwork(network)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                handleDeleteNetwork(network.network_id)
                              }
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Network Detail Dialog */}
          <Dialog
            open={!!viewingNetwork}
            onOpenChange={() => setViewingNetwork(null)}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{viewingNetwork?.network_name}</DialogTitle>
              </DialogHeader>

              {viewingNetwork && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <Badge
                        className={STATUS_CONFIG[viewingNetwork.status].color}
                      >
                        {STATUS_CONFIG[viewingNetwork.status].label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Consensus
                      </p>
                      <p className="font-medium capitalize">
                        {viewingNetwork.consensus}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Channel ID
                      </p>
                      <p className="font-medium">{viewingNetwork.channelId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Orderers
                      </p>
                      <p className="font-medium">
                        {viewingNetwork.ordererCount}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="mb-2 text-sm font-medium text-muted-foreground">
                        Organizations
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {viewingNetwork.organizations.map((org, idx) => (
                          <Badge key={idx} variant="outline">
                            {org}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
