import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Network, Package, FileText, Clock, Mail } from 'lucide-react'
import { useOrganizationMetrics } from '@/hooks/useOrganizationMetrics'
import { useBlockchainMetrics } from '@/hooks/useBlockchainMetrics'
import { useAssetMetrics } from '@/hooks/useAssetMetrics'
import { useSubmissionMetrics } from '@/hooks/useSubmissionMetrics'
import { useInvitationMetrics } from '@/hooks/useInvitationMetrics'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  subtitle?: string
  className?: string
}

function MetricCard({ label, value, icon, trend, subtitle, className = '' }: MetricCardProps) {
  return (
    <Card className={`bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
        </CardTitle>
        <div className="text-slate-400 dark:text-slate-600">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</div>
          {trend && (
            <Badge variant={trend.direction === 'up' ? 'default' : 'secondary'} className="text-xs">
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-12 mb-2" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

/**
 * Dashboard Metrics Section
 * Displays key performance indicators as metric cards
 */
export function DashboardMetricsSection() {
  const orgMetrics = useOrganizationMetrics()
  const blockchainMetrics = useBlockchainMetrics()
  const assetMetrics = useAssetMetrics()
  const submissionMetrics = useSubmissionMetrics()
  const invitationMetrics = useInvitationMetrics()

  const isLoading =
    orgMetrics.loading ||
    blockchainMetrics.loading ||
    assetMetrics.loading ||
    submissionMetrics.loading ||
    invitationMetrics.loading

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const metrics = [
    {
      label: 'Active Organizations',
      value: orgMetrics.data?.total ?? 0,
      icon: <Building2 className="h-5 w-5" />,
      trend: { value: 12, direction: 'up' as const },
      subtitle: 'Member organizations',
    },
    {
      label: 'Blockchain Networks',
      value: blockchainMetrics.data?.total_networks ?? 0,
      icon: <Network className="h-5 w-5" />,
      subtitle: `${blockchainMetrics.data?.total_channels ?? 0} channels`,
    },
    {
      label: 'Total Assets',
      value: assetMetrics.data?.total_assets ?? 0,
      icon: <Package className="h-5 w-5" />,
      subtitle: `$${(assetMetrics.data?.total_valuation ?? 0).toLocaleString()}`,
    },
    {
      label: 'Submissions',
      value: submissionMetrics.data?.total_submissions ?? 0,
      icon: <FileText className="h-5 w-5" />,
      subtitle: `${submissionMetrics.data?.approval_rate ?? 0}% approved`,
    },
    {
      label: 'Pending Approvals',
      value: submissionMetrics.data?.pending_approvals ?? 0,
      icon: <Clock className="h-5 w-5" />,
      trend: submissionMetrics.data?.pending_approvals ? { value: 5, direction: 'up' as const } : undefined,
      subtitle: 'Awaiting review',
    },
    {
      label: 'Pending Invites',
      value: invitationMetrics.data?.pending_count ?? 0,
      icon: <Mail className="h-5 w-5" />,
      subtitle: `${invitationMetrics.data?.acceptance_rate ?? 0}% accepted`,
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  )
}
