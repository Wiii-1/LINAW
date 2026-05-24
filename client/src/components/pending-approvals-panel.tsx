import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSubmissionMetrics } from '@/hooks/useSubmissionMetrics'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, AlertCircle } from 'lucide-react'

/**
 * Pending Approvals Panel
 * Quick summary of submissions awaiting approval
 */
export function PendingApprovalsPanel() {
  const { data, loading, error } = useSubmissionMetrics()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const pendingCount = data?.pending_approvals ?? 0
  const totalSubmissions = data?.total_submissions ?? 0
  const approvalRate = data?.approval_rate ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          Pending Approvals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Awaiting Review
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {pendingCount}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${totalSubmissions > 0 ? (pendingCount / totalSubmissions) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Submissions</p>
            <p className="text-lg font-semibold">{totalSubmissions}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Approval Rate</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {approvalRate}%
            </p>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">{pendingCount} submission{pendingCount !== 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} review</p>
              <p className="text-xs opacity-75">Review and approve pending submissions</p>
            </div>
          </div>
        )}

        <Button className="w-full" variant="default">
          Review Submissions
        </Button>
      </CardContent>
    </Card>
  )
}
