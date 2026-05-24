import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBlockchainMetrics } from '@/hooks/useBlockchainMetrics'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

/**
 * Blockchain Distribution Chart
 * Shows the distribution of networks, channels, and contracts
 */
export function BlockchainDistributionChart() {
  const { data, loading, error } = useBlockchainMetrics()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blockchain Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blockchain Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = [
    { name: 'Networks', value: data?.total_networks ?? 0 },
    { name: 'Channels', value: data?.total_channels ?? 0 },
    { name: 'Contracts', value: data?.total_contracts ?? 0 },
  ]

  const hasData = chartData.some(item => item.value > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blockchain Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-500">
            <p>No blockchain data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
