import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface InvitationMetric {
  id: string
  organization_id: string
  invited_email: string
  role: string
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED'
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface InvitationMetricsData {
  total_invitations: number
  pending_count: number
  accepted_count: number
  expired_count: number
  acceptance_rate: number
  recent_invitations: InvitationMetric[]
  expiring_soon: InvitationMetric[]
  trend: {
    date: string
    sent: number
    accepted: number
    expired: number
  }[]
}

interface UseInvitationMetricsResult {
  data: InvitationMetricsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch organization invitation metrics
 * @returns Invitation metrics data with loading and error states
 */
export function useInvitationMetrics(): UseInvitationMetricsResult {
  const [data, setData] = useState<InvitationMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v1/organization-invites/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch invitation metrics')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invitation metrics'
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
