import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface NetworkMetric {
  id: string
  name: string
  channel_count: number
  contract_count: number
  created_at: string
}

export interface ChannelMetric {
  id: string
  name: string
  network_id: string
  contract_count: number
}

export interface BlockchainMetricsData {
  total_networks: number
  total_channels: number
  total_contracts: number
  networks: NetworkMetric[]
  channels: ChannelMetric[]
  trend: {
    date: string
    networks: number
    channels: number
  }[]
}

interface UseBlockchainMetricsResult {
  data: BlockchainMetricsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch blockchain network and channel metrics
 * @returns Blockchain metrics data with loading and error states
 */
export function useBlockchainMetrics(): UseBlockchainMetricsResult {
  const [data, setData] = useState<BlockchainMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v1/networks/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch blockchain metrics')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch blockchain metrics'
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
