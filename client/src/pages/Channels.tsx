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

interface NetworkSummary {
  network_id: number
  network_name: string
}

interface Channel {
  channel_id: string
  name: string
  network_id: number
  network_name?: string
  status: "creating" | "active" | "failed"
  memberOrgs: string[]
  created_at: string
}

const STATUS_CONFIG = {
  creating: { label: "Creating", color: "bg-yellow-100 text-yellow-800" },
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  failed: { label: "Failed", color: "bg-red-100 text-red-800" },
} as const

const normalizeStatus = (status: unknown): Channel["status"] => {
  if (status === "creating" || status === "active" || status === "failed") {
    return status
  }

  return "creating"
}

const mapStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item === "string") return item
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>
        const name =
          record.name ?? record.orgName ?? record.organization_name ?? record.mspId ?? record.msp_id
        return typeof name === "string" ? name : ""
      }
      return ""
    })
    .map((item) => item.trim())
    .filter(Boolean)
}

const toNetworkSummary = (
  value: unknown,
  fallbackId: number,
): NetworkSummary => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  const rawId = record.network_id ?? record.id ?? fallbackId
  const parsedId = typeof rawId === "number" ? rawId : Number.parseInt(String(rawId), 10)
  const networkId = Number.isFinite(parsedId) ? parsedId : fallbackId

  const networkName =
    (typeof record.network_name === "string" && record.network_name) ||
    (typeof record.name === "string" && record.name) ||
    `network-${networkId}`

  return {
    network_id: networkId,
    network_name: networkName,
  }
}

const toChannel = (
  value: unknown,
  fallbackId: number,
  fallback?: Partial<Channel>,
): Channel => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  const rawNetworkId =
    record.network_id ?? record.networkId ?? fallback?.network_id ?? fallbackId
  const parsedNetworkId =
    typeof rawNetworkId === "number"
      ? rawNetworkId
      : Number.parseInt(String(rawNetworkId), 10)
  const networkId = Number.isFinite(parsedNetworkId) ? parsedNetworkId : fallbackId

  const channelIdValue =
    record.channel_id ?? record.id ?? record.name ?? fallback?.channel_id ?? `channel-${networkId}`
  const channelId = String(channelIdValue)

  const name =
    (typeof record.name === "string" && record.name) ||
    (typeof record.channelName === "string" && record.channelName) ||
    fallback?.name ||
    channelId

  const networkName =
    (typeof record.network_name === "string" && record.network_name) ||
    (typeof record.networkName === "string" && record.networkName) ||
    fallback?.network_name

  const createdAt =
    (typeof record.created_at === "string" && record.created_at) ||
    (typeof record.createdAt === "string" && record.createdAt) ||
    fallback?.created_at ||
    new Date().toISOString()

  return {
    channel_id: channelId,
    name,
    network_id: networkId,
    network_name: networkName,
    status: normalizeStatus(record.status ?? fallback?.status),
    memberOrgs: mapStringList(record.memberOrgs ?? record.orgs ?? fallback?.memberOrgs),
    created_at: createdAt,
  }
}

export default function Channels() {
  const [networks, setNetworks] = useState<NetworkSummary[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewingChannel, setViewingChannel] = useState<Channel | null>(null)
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"

  const [formData, setFormData] = useState({
    networkId: "",
    channelName: "",
    memberOrgs: [] as string[],
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

        setNetworks(rawNetworks.map((network: unknown, index: number) => toNetworkSummary(network, index + 1)))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load networks")
      } finally {
        setLoading(false)
      }
    }

    void loadNetworks()
  }, [backendUrl])

  // TODO: Load persisted channels from backend when a channel list endpoint is available.

  const getNetworkLabel = (networkId: number): string => {
    const network = networks.find((item) => item.network_id === networkId)
    return network ? `${network.network_name} (#${network.network_id})` : `Network #${networkId}`
  }

  const handleAddMemberOrg = () => {
    const nextOrg = formData.orgName.trim()
    if (!nextOrg) return

    setFormData((prev) => ({
      ...prev,
      memberOrgs: [...prev.memberOrgs, nextOrg],
      orgName: "",
    }))
  }

  const handleRemoveMemberOrg = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      memberOrgs: prev.memberOrgs.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const resetForm = () => {
    setFormData({
      networkId: "",
      channelName: "",
      memberOrgs: [],
      orgName: "",
    })
  }

  const handleCreateChannel = async () => {
    try {
      setError(null)

      if (!formData.networkId.trim()) {
        setError("Network ID is required")
        return
      }

      const networkId = Number.parseInt(formData.networkId, 10)
      if (!Number.isFinite(networkId) || networkId <= 0) {
        setError("Network ID is required")
        return
      }

      const channelName = formData.channelName.trim().toLowerCase()
      if (!channelName) {
        setError("Channel name is required")
        return
      }

      if (formData.memberOrgs.length === 0) {
        setError("At least one member org is required")
        return
      }

      const payload = {
        name: channelName,
        memberOrgs: formData.memberOrgs.map((org) => org.trim()).filter(Boolean),
      }

      const headers = await getAuthHeaders()
      const response = await fetch(`${backendUrl}/api/v1/networks/${networkId}/channels`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Failed to create channel: ${response.statusText}`)
      }

      const result = await response.json()
      const createdSource = result?.data ?? result?.channel ?? result?.orchestration?.channel ?? result
      const fallbackId = Math.max(...channels.map((channel) => Number.parseInt(channel.channel_id, 10) || 0), 0) + 1

      const createdChannel = toChannel(createdSource, fallbackId, {
        network_id: networkId,
        network_name: getNetworkLabel(networkId),
        name: channelName,
        status: "creating",
        memberOrgs: payload.memberOrgs,
        created_at: new Date().toISOString(),
      })

      setChannels((prev) => [createdChannel, ...prev])
      resetForm()
      setIsDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel")
    }
  }

  const handleDeleteChannel = (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return

    setChannels((prev) => prev.filter((channel) => channel.channel_id !== channelId))
    if (viewingChannel?.channel_id === channelId) {
      setViewingChannel(null)
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
        <SiteHeader title="Channels" />
        <main className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <PageHero
            title="Channels"
            description="Manage Hyperledger Fabric channels for your networks"
            actions={
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-white text-slate-950 hover:bg-white/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Channel
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-lg">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      void handleCreateChannel()
                    }}
                    noValidate
                  >
                    <DialogHeader>
                      <DialogTitle>Create New Channel</DialogTitle>
                      <DialogDescription>
                        Provision a new Fabric channel on an existing network
                      </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="gap-4 py-4">
                      <Field>
                        <Label htmlFor="network-id">Target Network *</Label>
                        <Select
                          value={formData.networkId}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, networkId: value }))
                          }
                        >
                          <SelectTrigger id="network-id">
                            <SelectValue placeholder={loading ? "Loading networks..." : "Select a network"} />
                          </SelectTrigger>
                          <SelectContent>
                            {networks.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                No networks available
                              </SelectItem>
                            ) : (
                              networks.map((network) => (
                                <SelectItem
                                  key={network.network_id}
                                  value={String(network.network_id)}
                                >
                                  {network.network_name} (#{network.network_id})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          Choose the Fabric network that will host this channel
                        </FieldDescription>
                      </Field>

                      <Field>
                        <Label htmlFor="channel-name">Channel Name *</Label>
                        <Input
                          id="channel-name"
                          placeholder="e.g., mychannel"
                          value={formData.channelName}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              channelName: e.target.value,
                            }))
                          }
                        />
                        <FieldDescription>
                          Lowercase channel identifier used by Fabric
                        </FieldDescription>
                      </Field>

                      <Field>
                        <Label htmlFor="member-org-input">Member Organizations *</Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id="member-org-input"
                              placeholder="Organization name or MSP ID"
                              value={formData.orgName}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  orgName: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleAddMemberOrg()
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddMemberOrg}
                            >
                              Add
                            </Button>
                          </div>

                          <div className="space-y-1">
                            {formData.memberOrgs.map((org, index) => (
                              <div
                                key={`${org}-${index}`}
                                className="flex items-center justify-between rounded bg-gray-50 p-2"
                              >
                                <span className="text-sm font-medium">{org}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMemberOrg(index)}
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <FieldDescription>
                          Add the organizations that should join the new channel
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
                      <Button type="submit">Create Channel</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            }
          />

          {error && !isDialogOpen ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-lg border bg-card text-card-foreground">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Loading channels...</p>
              </div>
            ) : channels.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">
                  No channels found. Create one to get started.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead>Channel Name</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Member Orgs</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Row actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => (
                    <TableRow key={channel.channel_id}>
                      <TableCell className="font-medium">{channel.name}</TableCell>
                      <TableCell className="text-sm">
                        {channel.network_name ?? getNetworkLabel(channel.network_id)}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[channel.status].color}>
                          {STATUS_CONFIG[channel.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {channel.memberOrgs.map((org, idx) => (
                            <Badge key={`${channel.channel_id}-${org}-${idx}`} variant="outline">
                              {org}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(channel.created_at).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => setViewingChannel(channel)}>
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDeleteChannel(channel.channel_id)}
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

          <Dialog
            open={!!viewingChannel}
            onOpenChange={(open) => {
              if (!open) {
                setViewingChannel(null)
              }
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{viewingChannel?.name}</DialogTitle>
              </DialogHeader>

              {viewingChannel ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <Badge className={STATUS_CONFIG[viewingChannel.status].color}>
                        {STATUS_CONFIG[viewingChannel.status].label}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Network
                      </p>
                      <p className="font-medium">
                        {viewingChannel.network_name ?? getNetworkLabel(viewingChannel.network_id)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Channel ID
                      </p>
                      <p className="font-medium">{viewingChannel.channel_id}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Created
                      </p>
                      <p className="font-medium">
                        {new Date(viewingChannel.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="mb-2 text-sm font-medium text-muted-foreground">
                        Member Organizations
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {viewingChannel.memberOrgs.map((org, idx) => (
                          <Badge key={`${viewingChannel.channel_id}-${org}-${idx}`} variant="outline">
                            {org}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}