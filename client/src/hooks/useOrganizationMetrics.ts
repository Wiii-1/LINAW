import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface OrganizationMetric {
  id: string
  name: string
  msp_id: string
  user_count: number
  created_at: string
  updated_at: string
}

export interface OrganizationMetricsData {
  total: number
  organizations: OrganizationMetric[]
  trend: {
    date: string
    count: number
  }[]
}

interface UseOrganizationMetricsResult {
  data: OrganizationMetricsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch organization metrics and data
 * @returns Organization metrics data with loading and error states
 */
export function useOrganizationMetrics(): UseOrganizationMetricsResult {
  const [data, setData] = useState<OrganizationMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v1/organizations/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch organization metrics')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch organization metrics'
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
