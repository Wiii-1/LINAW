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
import { Field, FieldGroup } from "@/components/ui/field"
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
import { Badge } from "@/components/ui/badge"
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
import { FileText, Plus, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface Submission {
  submission_id: number
  proposalType: string
  status: "draft" | "submitted" | "approved" | "rejected" | "changes-requested"
  owner: string
  fileName?: string
  fileSize?: number
  remarks?: string
  created_at: string
  updated_at?: string
}

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-800",
    icon: AlertCircle,
  },
  submitted: {
    label: "Submitted",
    color: "bg-blue-100 text-blue-800",
    icon: FileText,
  },
  "changes-requested": {
    label: "Changes Requested",
    color: "bg-yellow-100 text-yellow-800",
    icon: AlertCircle,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
}

export default function ApprovalWorkflow() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(
    null
  )
  const [actionDialog, setActionDialog] = useState<{
    type: "approve" | "reject" | "request-changes" | null
    submission: Submission | null
  }>({ type: null, submission: null })

  // Form state
  const [formData, setFormData] = useState({
    proposalType: "",
    fileName: "",
    file: null as File | null,
  })

  const [actionRemarks, setActionRemarks] = useState("")
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()

    if (!token) {
      throw new Error("Authentication required")
    }

    return {
      Authorization: `Bearer ${token}`,
    }
  }

  const getJsonAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers = await getAuthHeaders()

    return {
      ...headers,
      "Content-Type": "application/json",
    }
  }

  const parseJsonResponse = async (response: Response) => {
    const text = await response.text()
    if (!text) return null

    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  const mapSubmission = (item: Record<string, unknown>, fallback: Submission): Submission => {
    const rawStatus =
      (typeof item.status === "string" && item.status.toLowerCase()) ||
      fallback.status
    const status =
      rawStatus === "draft" ||
      rawStatus === "submitted" ||
      rawStatus === "approved" ||
      rawStatus === "rejected" ||
      rawStatus === "changes-requested"
        ? rawStatus
        : fallback.status

    const rawId = item.submission_id ?? item.submissionId ?? fallback.submission_id
    const parsedId = typeof rawId === "number" ? rawId : Number.parseInt(String(rawId), 10)

    return {
      submission_id: Number.isFinite(parsedId) ? parsedId : fallback.submission_id,
      proposalType:
        (typeof item.proposalType === "string" && item.proposalType) ||
        (typeof item.proposal_type === "string" && item.proposal_type) ||
        fallback.proposalType,
      status,
      owner:
        (typeof item.ownerName === "string" && item.ownerName) ||
        (typeof item.owner === "string" && item.owner) ||
        fallback.owner,
      fileName:
        (typeof item.fileName === "string" && item.fileName) ||
        (typeof item.originalFileName === "string" && item.originalFileName) ||
        fallback.fileName,
      fileSize:
        typeof item.fileSize === "number"
          ? item.fileSize
          : typeof item.size === "number"
            ? item.size
            : fallback.fileSize,
      remarks:
        (typeof item.remarks === "string" && item.remarks) ||
        fallback.remarks,
      created_at:
        (typeof item.created_at === "string" && item.created_at) ||
        (typeof item.createdAt === "string" && item.createdAt) ||
        fallback.created_at,
      updated_at:
        (typeof item.updated_at === "string" && item.updated_at) ||
        (typeof item.updatedAt === "string" && item.updatedAt) ||
        fallback.updated_at,
    }
  }

  const setUpdatedSubmissionState = (updated: Submission) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.submission_id === updated.submission_id ? updated : s))
    )

    if (viewingSubmission?.submission_id === updated.submission_id) {
      setViewingSubmission(updated)
    }
  }

  // Load submissions on mount
  useEffect(() => {
    const loadSubmissions = async () => {
      setLoading(true)
      setError(null)
      try {
        // TODO: replace mock with backend GET + auth header when list endpoint is available
        // Mock data for demo (backendUrl can be used for real API calls)
        setSubmissions([
          {
            submission_id: 1,
            proposalType: "capex-request",
            status: "submitted",
            owner: "John Doe",
            fileName: "capex-2026.pdf",
            fileSize: 2048000,
            created_at: new Date(
              Date.now() - 2 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
          {
            submission_id: 2,
            proposalType: "budget-allocation",
            status: "approved",
            owner: "Jane Smith",
            fileName: "budget-q2-2026.docx",
            fileSize: 1024000,
            remarks: "Approved. Please proceed with implementation.",
            created_at: new Date(
              Date.now() - 5 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
          {
            submission_id: 3,
            proposalType: "vendor-onboarding",
            status: "changes-requested",
            owner: "Bob Johnson",
            fileName: "vendor-proposal.pdf",
            fileSize: 512000,
            remarks:
              "Please clarify the pricing structure and provide references.",
            created_at: new Date(
              Date.now() - 10 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
          {
            submission_id: 4,
            proposalType: "policy-update",
            status: "draft",
            owner: "Alice Wilson",
            created_at: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
        ])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load submissions"
        )
      } finally {
        setLoading(false)
      }
    }

    loadSubmissions()
  }, [])

  const handleCreateSubmission = async () => {
    try {
      setError(null)
      if (!formData.proposalType) {
        setError("Please select a proposal type")
        return
      }

      if (!formData.file) {
        setError("Please upload a PDF file")
        return
      }

      if (
        formData.file.type !== "application/pdf" &&
        !formData.file.name.endsWith(".pdf")
      ) {
        setError("Only PDF files are allowed")
        return
      }

      const form = new FormData()
      form.append("proposalType", formData.proposalType)
      form.append("file", formData.file, formData.file.name)

      const headers = await getAuthHeaders()
      const response = await fetch(`${backendUrl}/api/v1/submissions`, {
        method: "POST",
        headers,
        body: form,
      })

      const data = await parseJsonResponse(response)

      if (!response.ok) {
        const errorMessage =
          data &&
          typeof data === "object" &&
          data.error &&
          typeof data.error === "object" &&
          typeof (data.error as { message?: unknown }).message === "string"
            ? ((data.error as { message: string }).message)
            : "Failed to create submission"
        throw new Error(errorMessage)
      }

      const fallback: Submission = {
        submission_id: Math.max(...submissions.map((s) => s.submission_id), 0) + 1,
        proposalType: formData.proposalType,
        status: "draft",
        owner: "Current User",
        fileName: formData.fileName || undefined,
        created_at: new Date().toISOString(),
      }

      const createdSource =
        data && typeof data === "object"
          ? (data as { data?: unknown }).data ?? data
          : null

      const createdSubmission =
        createdSource && typeof createdSource === "object"
          ? mapSubmission(createdSource as Record<string, unknown>, fallback)
          : fallback

      setSubmissions((prev) => [createdSubmission, ...prev])
      setFormData({ proposalType: "", fileName: "", file: null })
      setIsDialogOpen(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create submission"
      )
    }
  }

  const handleSubmitForApproval = async (submission: Submission) => {
    try {
      setError(null)
      const headers = await getJsonAuthHeaders()
      const response = await fetch(
        `${backendUrl}/api/v1/submissions/${submission.submission_id}/submit`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        }
      )

      const data = await parseJsonResponse(response)

      if (!response.ok) {
        const errorMessage =
          data &&
          typeof data === "object" &&
          data.error &&
          typeof data.error === "object" &&
          typeof (data.error as { message?: unknown }).message === "string"
            ? ((data.error as { message: string }).message)
            : "Failed to submit for approval"
        throw new Error(errorMessage)
      }

      const updatedSource =
        data && typeof data === "object"
          ? (data as { data?: unknown }).data ?? data
          : null
      const fallbackUpdated: Submission = {
        ...submission,
        status: "submitted",
        updated_at: new Date().toISOString(),
      }

      const updated =
        updatedSource && typeof updatedSource === "object"
          ? mapSubmission(updatedSource as Record<string, unknown>, fallbackUpdated)
          : fallbackUpdated

      setUpdatedSubmissionState(updated)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit for approval"
      )
    }
  }

  const handleApprovalAction = (
    type: "approve" | "reject" | "request-changes",
    submission: Submission
  ) => {
    setActionDialog({ type, submission })
  }

  const confirmAction = async () => {
    if (!actionDialog.submission || !actionDialog.type) return

    try {
      setError(null)

      const endpointByType: Record<"approve" | "reject" | "request-changes", string> = {
        approve: "approve",
        reject: "reject",
        "request-changes": "request-changes",
      }

      const nextStatusByType: Record<"approve" | "reject" | "request-changes", Submission["status"]> = {
        approve: "approved",
        reject: "rejected",
        "request-changes": "changes-requested",
      }

      const endpoint = endpointByType[actionDialog.type]
      const headers = await getJsonAuthHeaders()
      const response = await fetch(
        `${backendUrl}/api/v1/submissions/${actionDialog.submission.submission_id}/${endpoint}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ remarks: actionRemarks }),
        }
      )

      const data = await parseJsonResponse(response)

      if (!response.ok) {
        const errorMessage =
          data &&
          typeof data === "object" &&
          data.error &&
          typeof data.error === "object" &&
          typeof (data.error as { message?: unknown }).message === "string"
            ? ((data.error as { message: string }).message)
            : "Failed to update submission status"
        throw new Error(errorMessage)
      }

      const updatedSource =
        data && typeof data === "object"
          ? (data as { data?: unknown }).data ?? data
          : null
      const fallbackUpdated: Submission = {
        ...actionDialog.submission,
        status: nextStatusByType[actionDialog.type],
        remarks: actionRemarks,
        updated_at: new Date().toISOString(),
      }

      const updated =
        updatedSource && typeof updatedSource === "object"
          ? mapSubmission(updatedSource as Record<string, unknown>, fallbackUpdated)
          : fallbackUpdated

      setUpdatedSubmissionState(updated)
      setActionDialog({ type: null, submission: null })
      setActionRemarks("")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update submission status"
      )
    }
  }

  const getStatusIcon = (status: Submission["status"]) => {
    const Icon = STATUS_CONFIG[status].icon
    return <Icon className="mr-1 inline h-4 w-4" />
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
        <SiteHeader title="Submissions" />
        <main className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <PageHero
            title="Submissions Approval"
            description="Manage document submissions and approvals"
            actions={
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-white text-slate-950 hover:bg-white/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Submission
                  </Button>
                </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleCreateSubmission()
                  }}
                  noValidate
                >
                  <DialogHeader>
                    <DialogTitle>Create New Submission</DialogTitle>
                    <DialogDescription>
                      Create a new proposal or document for approval
                    </DialogDescription>
                  </DialogHeader>

                  <FieldGroup className="gap-4 py-4">
                    <Field>
                      <Label htmlFor="proposal-type">Proposal Type *</Label>
                      <Select
                        value={formData.proposalType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, proposalType: value })
                        }
                      >
                        <SelectTrigger id="proposal-type">
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="capex-request">
                            Capital Expenditure Request
                          </SelectItem>
                          <SelectItem value="budget-allocation">
                            Budget Allocation
                          </SelectItem>
                          <SelectItem value="vendor-onboarding">
                            Vendor Onboarding
                          </SelectItem>
                          <SelectItem value="policy-update">
                            Policy Update
                          </SelectItem>
                          <SelectItem value="contract-review">
                            Contract Review
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <Label htmlFor="file">PDF File *</Label>
                      <Input
                        id="file"
                        type="file"
                        required
                        accept="application/pdf,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null

                          setFormData({
                            ...formData,
                            file,
                            fileName: file?.name ?? "",
                          })
                        }}
                      />
                      {formData.fileName ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Selected file: {formData.fileName}
                        </p>
                      ) : null}
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
                    <Button type="submit">Create Submission</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
              </Dialog>
            }
          />

          {error && !isDialogOpen && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-lg border bg-card text-card-foreground">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">No submissions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Proposal Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Row actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.submission_id}>
                      <TableCell className="font-medium">
                        #{submission.submission_id}
                      </TableCell>
                      <TableCell>
                        {submission.proposalType.replace(/-/g, " ")}
                      </TableCell>
                      <TableCell>{submission.owner}</TableCell>
                      <TableCell>
                        <Badge
                          className={STATUS_CONFIG[submission.status].color}
                        >
                          {getStatusIcon(submission.status)}
                          {STATUS_CONFIG[submission.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
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
                              onClick={() => setViewingSubmission(submission)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive">
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

          {/* Submission Detail Dialog */}
          <Dialog
            open={!!viewingSubmission}
            onOpenChange={() => setViewingSubmission(null)}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Submission #{viewingSubmission?.submission_id}
                </DialogTitle>
              </DialogHeader>

              {viewingSubmission && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Proposal Type
                      </p>
                      <p className="font-medium">
                        {viewingSubmission.proposalType.replace(/-/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <Badge
                        className={
                          STATUS_CONFIG[viewingSubmission.status].color
                        }
                      >
                        {getStatusIcon(viewingSubmission.status)}
                        {STATUS_CONFIG[viewingSubmission.status].label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Owner
                      </p>
                      <p className="font-medium">{viewingSubmission.owner}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Created
                      </p>
                      <p className="font-medium">
                        {new Date(
                          viewingSubmission.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {viewingSubmission.fileName && (
                    <div className="border-t pt-4">
                      <p className="mb-2 text-sm font-medium text-muted-foreground">
                        Attachment
                      </p>
                      <div className="flex items-center gap-2 rounded bg-gray-50 p-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {viewingSubmission.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(viewingSubmission.fileSize || 0) / 1024 / 1024} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {viewingSubmission.remarks && (
                    <div className="border-t pt-4">
                      <p className="mb-2 text-sm font-medium text-muted-foreground">
                        Remarks
                      </p>
                      <p className="rounded bg-gray-50 p-2 text-sm">
                        {viewingSubmission.remarks}
                      </p>
                    </div>
                  )}

                  {viewingSubmission.status === "draft" && (
                    <div className="border-t pt-4">
                      <Button
                        className="w-full"
                        onClick={() =>
                          handleSubmitForApproval(viewingSubmission)
                        }
                      >
                        Submit for Approval
                      </Button>
                    </div>
                  )}

                  {viewingSubmission.status === "submitted" && (
                    <div className="space-y-2 border-t pt-4">
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() =>
                          handleApprovalAction("approve", viewingSubmission)
                        }
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() =>
                          handleApprovalAction(
                            "request-changes",
                            viewingSubmission
                          )
                        }
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Request Changes
                      </Button>
                      <Button
                        className="w-full"
                        variant="destructive"
                        onClick={() =>
                          handleApprovalAction("reject", viewingSubmission)
                        }
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {(viewingSubmission.status === "changes-requested" ||
                    viewingSubmission.status === "rejected") && (
                    <div className="border-t pt-4">
                      <Button className="w-full" variant="outline">
                        Resubmit
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Action Dialog */}
          <Dialog
            open={actionDialog.type !== null}
            onOpenChange={(open) => {
              if (!open) setActionDialog({ type: null, submission: null })
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {actionDialog.type === "approve" && "Approve Submission"}
                  {actionDialog.type === "reject" && "Reject Submission"}
                  {actionDialog.type === "request-changes" && "Request Changes"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Field>
                  <Label htmlFor="remarks">Remarks *</Label>
                  <textarea
                    id="remarks"
                    placeholder="Enter your remarks..."
                    value={actionRemarks}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setActionRemarks(e.target.value)
                    }
                    className="min-h-25 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                    rows={4}
                  />
                </Field>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={confirmAction}
                  variant={
                    actionDialog.type === "reject" ? "destructive" : "default"
                  }
                >
                  {actionDialog.type === "approve" && "Approve"}
                  {actionDialog.type === "reject" && "Reject"}
                  {actionDialog.type === "request-changes" && "Request Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
