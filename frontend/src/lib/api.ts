// Same-origin API client. The browser only talks to /api/*, which next.config.js
// rewrites to the FastAPI backend (decision D5), so no CORS is involved.
import type {
  CreateEvaluationRequest,
  DashboardResponse,
  EvaluationAction,
  EvaluationDetail,
  EvaluationList,
  FieldError,
  HealthResponse,
  Language,
  ListEvaluationsParams,
  Sample,
  ScanRequest,
  ScanResponse,
  SettingsResponse,
} from './types'

const API_BASE = '/api'

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldError[]
  readonly requestId: string | null

  constructor(status: number, message: string, fieldErrors: FieldError[] = [], requestId: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.requestId = requestId
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }
}

function fallbackMessage(status: number): string {
  if (status === 404) return 'Not found.'
  if (status === 422) return 'The request was rejected by validation.'
  if (status === 502 || status === 503 || status === 504 || status === 500) {
    return 'The backend is unreachable or returned an error. Make sure it is running on the configured BACKEND_URL.'
  }
  return `Request failed (HTTP ${status}).`
}

/** Parses `{detail}` and `{detail, errors:[{field,message}]}` error bodies. */
function toApiError(status: number, body: unknown, requestId: string | null): ApiError {
  let message = fallbackMessage(status)
  let fieldErrors: FieldError[] = []
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    if (typeof record.detail === 'string' && record.detail.trim()) {
      message = record.detail
    }
    if (Array.isArray(record.errors)) {
      fieldErrors = record.errors
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e) => ({ field: String(e.field ?? ''), message: String(e.message ?? '') }))
    }
    if (!requestId && typeof record.request_id === 'string') requestId = record.request_id
  }
  return new ApiError(status, message, fieldErrors, requestId)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...init, headers })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'Cannot reach the SecureReflex server. Check your connection and that the app is running.')
  }

  const requestId = response.headers.get('X-Request-ID')
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null // non-JSON (e.g. proxy error page) -> generic message
    }
  }

  if (!response.ok) throw toApiError(response.status, body, requestId)
  if (body === null && text) {
    throw new ApiError(response.status, 'The server returned an unexpected response.', [], requestId)
  }
  return body as T
}

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const getHealth = (signal?: AbortSignal) => request<HealthResponse>('/health', { signal })

export const getSettings = (signal?: AbortSignal) => request<SettingsResponse>('/settings', { signal })

export const getSamples = (language?: Language, signal?: AbortSignal) =>
  request<Sample[]>(`/samples${query({ language })}`, { signal })

export const scanCode = (body: ScanRequest) =>
  request<ScanResponse>('/scan', { method: 'POST', body: JSON.stringify(body) })

export const createEvaluation = (body: CreateEvaluationRequest) =>
  request<EvaluationDetail>('/evaluations', { method: 'POST', body: JSON.stringify(body) })

export const getEvaluation = (id: string, signal?: AbortSignal) =>
  request<EvaluationDetail>(`/evaluations/${encodeURIComponent(id)}`, { signal })

export const listEvaluations = (params: ListEvaluationsParams = {}, signal?: AbortSignal) =>
  request<EvaluationList>(
    `/evaluations${query({
      page: params.page,
      page_size: params.page_size,
      status: params.status,
      language: params.language,
    })}`,
    { signal },
  )

export const deleteEvaluation = (id: string) =>
  request<EvaluationAction>(`/evaluations/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const cancelEvaluation = (id: string, reason?: string) =>
  request<EvaluationAction>(`/evaluations/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  })

export const getDashboard = (signal?: AbortSignal) => request<DashboardResponse>('/analytics/dashboard', { signal })

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return 'Something went wrong. Please try again.'
}
