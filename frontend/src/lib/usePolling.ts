'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getEvaluation } from './api'
import { isTerminalStatus } from './format'
import type { EvaluationDetail } from './types'

export const POLL_INTERVAL_MS = 900

interface PollingState {
  data: EvaluationDetail | null
  error: ApiError | null
  loading: boolean
  /** Re-fetch immediately (and resume polling if the evaluation is still running). */
  refresh: () => void
}

/**
 * Polls GET /api/evaluations/{id} every 900 ms until the evaluation is
 * completed, failed or cancelled. Stops on unmount or when `id` changes.
 * A 404 stops polling; transient errors keep retrying with a growing delay.
 */
export function useEvaluationPolling(id: string | null, initial?: EvaluationDetail | null): PollingState {
  const [data, setData] = useState<EvaluationDetail | null>(initial && initial.id === id ? initial : null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)
  const [tick, setTick] = useState(0)
  const initialRef = useRef(initial)
  initialRef.current = initial

  useEffect(() => {
    if (!id) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    const seed = initialRef.current
    setData((current) => (current && current.id === id ? current : seed && seed.id === id ? seed : null))
    setError(null)
    setLoading(true)

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    let failures = 0

    const poll = async () => {
      controller = new AbortController()
      try {
        const next = await getEvaluation(id, controller.signal)
        if (cancelled) return
        failures = 0
        setData(next)
        setError(null)
        setLoading(false)
        if (!isTerminalStatus(next.status)) timer = setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        const apiError = err instanceof ApiError ? err : new ApiError(0, 'Unexpected error while loading the evaluation.')
        setError(apiError)
        setLoading(false)
        if (apiError.status === 404 || apiError.status === 422) return
        failures += 1
        timer = setTimeout(poll, Math.min(POLL_INTERVAL_MS * 2 ** failures, 10_000))
      }
    }

    poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      controller?.abort()
    }
  }, [id, tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  return { data, error, loading, refresh }
}
