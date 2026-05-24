import { AppSidebar } from "@/components/app-sidebar"
import { PageHero } from "@/components/page-hero"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useCallback, useEffect, useState, type CSSProperties } from "react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"

interface Asset {
  id: string
  color: string
  size: number
  owner: string
  appraisedValue: number
  created_at?: string
  updated_at?: string
}

type AssetRecord = Record<string, unknown>

const emptyAssetForm: Omit<Asset, "created_at" | "updated_at"> = {
  id: "",
  color: "",
  size: 0,
  owner: "",
  appraisedValue: 0,
}

function isAssetRecord(value: unknown): value is AssetRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function hasAssetFields(value: AssetRecord): boolean {
  return (
    "id" in value ||
    "asset_id" in value ||
    "color" in value ||
    "size" in value ||
    "owner" in value ||
    "appraisedValue" in value ||
    "appraised_value" in value ||
    "created_at" in value ||
    "updated_at" in value
  )
}

function extractAssetCollection(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isAssetRecord(payload)) {
    return []
  }

  const candidates = [payload.data, payload.assets, payload.items]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  const wrappedSingle = payload.data ?? payload.asset ?? payload.item
  if (isAssetRecord(wrappedSingle)) {
    return [wrappedSingle]
  }

  if (hasAssetFields(payload)) {
    return [payload]
  }

  return []
}

function normalizeAsset(asset: unknown): Asset {
  if (!isAssetRecord(asset)) {
    return {
      id: "",
      color: "",
      size: 0,
      owner: "",
      appraisedValue: 0,
      created_at: "",
      updated_at: "",
    }
  }

  return {
    id: asString(asset.id ?? asset.asset_id ?? ""),
    color: asString(asset.color ?? ""),
    size: asNumber(asset.size),
    owner: asString(asset.owner ?? ""),
    appraisedValue: asNumber(asset.appraisedValue ?? asset.appraised_value),
    created_at: asString(asset.created_at),
    updated_at: asString(asset.updated_at),
  }
}

function formatAssetValue(value: unknown): string {
  return `$${asNumber(value).toLocaleString()}`
}

async function buildAuthHeaders(includeContentType = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}

  if (includeContentType) {
    headers["Content-Type"] = "application/json"
  }

  const auth = getAuth()
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken()
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.warn("Could not obtain ID token", error)
    }
  }

  return headers
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error("Expected JSON response from server")
  }
}

async function fetchAssets(backendUrl: string): Promise<Asset[]> {
  const headers = await buildAuthHeaders()
  const response = await fetch(`${backendUrl}/api/v1/assets`, {
    method: "GET",
    headers,
  })

  if (!response.ok) {
    throw new Error(`Failed to load assets: ${response.statusText}`)
  }

  const payload = await readJsonResponse(response)
  return extractAssetCollection(payload)
    .map(normalizeAsset)
    .filter((asset) => asset.id || asset.color || asset.owner)
}

export default function AssetRegistry() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [formData, setFormData] = useState<Omit<Asset, "created_at" | "updated_at">>({
    ...emptyAssetForm,
  })

  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"

  const refreshAssets = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true)
      setError(null)

      try {
        const loadedAssets = await fetchAssets(backendUrl)
        setAssets(loadedAssets)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to load assets")
        setAssets([])
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [backendUrl]
  )

useEffect(() => {
  const load = async () => {
    await refreshAssets(true)
  }

  void load()
}, [refreshAssets])

  const handleCreateOrUpdate = async () => {
    try {
      setError(null)

      if (!formData.color.trim() || !formData.owner.trim()) {
        setError("Please fill in all required fields")
        return
      }

      const headers = await buildAuthHeaders()

      if (editingAsset) {
        const response = await fetch(`${backendUrl}/api/v1/assets/${editingAsset.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            color: formData.color.trim(),
            size: formData.size,
            owner: formData.owner.trim(),
            appraisedValue: formData.appraisedValue,
          }),
        })

        if (!response.ok) {
          const payload = await readJsonResponse(response)
          const message =
            isAssetRecord(payload) && isAssetRecord(payload.error)
              ? asString(payload.error.message) || "Failed to update asset"
              : "Failed to update asset"
          throw new Error(message)
        }

        await readJsonResponse(response)
      } else {
        const body: Record<string, unknown> = {
          color: formData.color.trim(),
          size: formData.size,
          owner: formData.owner.trim(),
          appraisedValue: formData.appraisedValue,
        }

        if (formData.id.trim()) {
          body.id = formData.id.trim()
        }

        const response = await fetch(`${backendUrl}/api/v1/assets`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const payload = await readJsonResponse(response)
          const message =
            isAssetRecord(payload) && isAssetRecord(payload.error)
              ? asString(payload.error.message) || "Failed to create asset"
              : "Failed to create asset"
          throw new Error(message)
        }

        await readJsonResponse(response)
      }

      await refreshAssets(true)
      setFormData({ ...emptyAssetForm })
      setEditingAsset(null)
      setIsDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed")
    }
  }

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset)
    setFormData({
      id: asset.id,
      color: asset.color,
      size: asset.size,
      owner: asset.owner,
      appraisedValue: asset.appraisedValue,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return

    try {
      setError(null)
      const headers = await buildAuthHeaders()

      const response = await fetch(`${backendUrl}/api/v1/assets/${assetId}`, {
        method: "DELETE",
        headers,
      })

      if (!response.ok) {
        const payload = await readJsonResponse(response)
        const message =
          isAssetRecord(payload) && isAssetRecord(payload.error)
            ? asString(payload.error.message) || "Failed to delete asset"
            : "Failed to delete asset"
        throw new Error(message)
      }

      await readJsonResponse(response)
      await refreshAssets(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete asset")
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingAsset(null)
    setFormData({ ...emptyAssetForm })
    setError(null)
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
        <SiteHeader title="Assets" />
        <main className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <PageHero
            title="Assets"
            description="Manage and track your assets"
            actions={
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-white text-slate-950 hover:bg-white/90"
                    onClick={() => {
                      setEditingAsset(null)
                      setFormData({ ...emptyAssetForm })
                      setError(null)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Asset
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      void handleCreateOrUpdate()
                    }}
                    noValidate
                  >
                    <DialogHeader>
                      <DialogTitle>
                        {editingAsset ? "Edit Asset" : "Create New Asset"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingAsset
                          ? "Update the asset details below"
                          : "Fill in the details to create a new asset"}
                      </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="gap-4 py-4">
                      <Field>
                        <Label htmlFor="asset-id">Asset ID (Optional)</Label>
                        <Input
                          id="asset-id"
                          placeholder="e.g., ASSET-001"
                          value={formData.id}
                          onChange={(e) =>
                            setFormData({ ...formData, id: e.target.value })
                          }
                          disabled={!!editingAsset}
                        />
                        <FieldDescription>
                          Auto-generated if left empty
                        </FieldDescription>
                      </Field>

                      <Field>
                        <Label htmlFor="color">Color *</Label>
                        <Input
                          id="color"
                          placeholder="e.g., Blue"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          required
                        />
                      </Field>

                      <Field>
                        <Label htmlFor="size">Size *</Label>
                        <Input
                          id="size"
                          type="number"
                          placeholder="e.g., 150"
                          value={formData.size}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              size: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          required
                        />
                      </Field>

                      <Field>
                        <Label htmlFor="owner">Owner *</Label>
                        <Input
                          id="owner"
                          placeholder="e.g., John Doe"
                          value={formData.owner}
                          onChange={(e) =>
                            setFormData({ ...formData, owner: e.target.value })
                          }
                          required
                        />
                      </Field>

                      <Field>
                        <Label htmlFor="value">Appraised Value (USD) *</Label>
                        <Input
                          id="value"
                          type="number"
                          placeholder="e.g., 50000"
                          value={formData.appraisedValue}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              appraisedValue: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          required
                        />
                      </Field>

                      {error ? (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                          {error}
                        </div>
                      ) : null}
                    </FieldGroup>

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button
                          variant="outline"
                          type="button"
                          onClick={handleDialogClose}
                        >
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit">
                        {editingAsset ? "Update Asset" : "Create Asset"}
                      </Button>
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
                <p className="text-muted-foreground">Loading assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">No assets found</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Appraised Value</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Row actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset, index) => (
                    <TableRow key={asset.id || `asset-${index}`}>
                      <TableCell className="font-medium">
                        {asset.id || "-"}
                      </TableCell>
                      <TableCell>{asset.color || "-"}</TableCell>
                      <TableCell>{asset.size}</TableCell>
                      <TableCell>{asset.owner || "-"}</TableCell>
                      <TableCell>
                        {formatAssetValue(asset.appraisedValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={!asset.id}
                            >
                              <span className="sr-only">Open actions menu</span>
                              ⋯
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(asset)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => void handleDelete(asset.id)}
                              disabled={!asset.id}
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
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}