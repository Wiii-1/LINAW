import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSubmissionMetrics } from '@/hooks/useSubmissionMetrics'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200' },
  SUBMITTED: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200' },
  APPROVED: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
  REJECTED: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
  CHANGES_REQUESTED: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200' },
}

/**
 * Format date to relative time string (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  }
  return 'Just now'
}

/**
 * Submissions Status Table
 * Displays recent submissions with status badges
 */
export function SubmissionsStatusTable() {
  const { data, loading, error } = useSubmissionMetrics()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const submissions = data?.recent_submissions ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Submissions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 dark:border-slate-700">
                <TableHead className="text-xs font-semibold">File Name</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Size</TableHead>
                <TableHead className="text-xs font-semibold">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length > 0 ? (
                submissions.map((submission) => {
                  const statusColors = STATUS_COLORS[submission.status] || STATUS_COLORS.DRAFT
                  const fileSize = (submission.size / 1024 / 1024).toFixed(2)

                  return (
                    <TableRow key={submission.id} className="border-b border-slate-100 dark:border-slate-800">
                      <TableCell className="text-sm">
                        <p className="truncate max-w-xs" title={submission.file_name}>
                          {submission.file_name}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusColors.bg} ${statusColors.text}`}>
                          {submission.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{fileSize} MB</TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {formatRelativeTime(submission.created_at)}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    No submissions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
