import BadgeError from "@/components/ui/badge-error"
import BadgePending from "@/components/ui/badge-pending"
import BadgeReady from "@/components/ui/badge-ready"
import type { DeploymentStatus } from "@/services/tenantOnboardingService"

function StatusBadge({ status }: { status: DeploymentStatus }) {
  if (status === "ready") return <BadgeReady />
  if (status === "error") return <BadgeError />
  return <BadgePending />
}

type OrgStatusSummaryProps = {
  status: DeploymentStatus
  rows: { label: string; value: string }[]
  errorMessage?: string
}

export function OrgStatusSummary({ status, rows, errorMessage }: OrgStatusSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium break-all">{row.value}</dd>
          </div>
        ))}
      </dl>
      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
