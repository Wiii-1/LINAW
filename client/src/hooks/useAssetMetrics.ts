import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface AssetMetric {
  id: string
  color: string
  size: number
  owner: string
  appraised_value: number
  created_at: string
  created_by: string
}

export interface AssetMetricsData {
  total_assets: number
  total_valuation: number
  average_valuation: number
  assets: AssetMetric[]
  by_owner: {
    owner: string
    count: number
    total_value: number
  }[]
  trend: {
    date: string
    count: number
    total_value: number
  }[]
}

interface UseAssetMetricsResult {
  data: AssetMetricsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch asset registry metrics
 * @returns Asset metrics data with loading and error states
 */
export function useAssetMetrics(): UseAssetMetricsResult {
  const [data, setData] = useState<AssetMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v1/assets/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch asset metrics')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch asset metrics'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { data, loading, error, refetch: fetchData }
}
