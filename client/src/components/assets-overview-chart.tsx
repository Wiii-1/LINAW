import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAssetMetrics } from '@/hooks/useAssetMetrics'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Assets Overview Chart
 * Displays asset valuation trends over time (last 30 days)
 */
export function AssetsOverviewChart() {
  const { data, loading, error } = useAssetMetrics()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Valuations Trend</CardTitle>
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
          <CardTitle>Asset Valuations Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data?.trend ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Valuations Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value) => {
                  if (typeof value === 'number' && value > 1000) {
                    return `$${(value / 1000).toFixed(2)}k`
                  }
                  return value
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="total_value"
                stroke="hsl(var(--chart-1))"
                fillOpacity={1}
                fill="url(#colorValue)"
                name="Total Value"
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#colorCount)"
                name="Asset Count"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
