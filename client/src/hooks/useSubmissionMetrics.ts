import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface SubmissionMetric {
  id: string
  owner: string
  file_name: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'
  mime_type: string
  size: number
  created_at: string
  updated_at: string
}

export interface SubmissionMetricsData {
  total_submissions: number
  pending_approvals: number
  approval_rate: number
  submissions_by_status: {
    DRAFT: number
    SUBMITTED: number
    APPROVED: number
    REJECTED: number
    CHANGES_REQUESTED: number
  }
  recent_submissions: SubmissionMetric[]
  trend: {
    date: string
    total: number
    approved: number
    rejected: number
  }[]
}

interface UseSubmissionMetricsResult {
  data: SubmissionMetricsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch submission and approval workflow metrics
 * @returns Submission metrics data with loading and error states
 */
export function useSubmissionMetrics(): UseSubmissionMetricsResult {
  const [data, setData] = useState<SubmissionMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v1/submissions/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch submission metrics')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch submission metrics'
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
