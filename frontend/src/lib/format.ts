import { AlertCircle, AlertOctagon, AlertTriangle, Info, type LucideIcon } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { EvaluationStatus, Language, Severity, SeverityCounts } from './types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------- severity
// Severity is never conveyed by colour alone: every badge pairs an icon with text.

export interface SeverityMeta {
  label: string
  icon: LucideIcon
  color: string // hex, for charts
  text: string // text colour class
  badge: string // badge classes
  bar: string // solid fill class
}

export const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  CRITICAL: {
    label: 'Critical',
    icon: AlertOctagon,
    color: '#f43f5e',
    text: 'text-sev-critical',
    badge: 'border-sev-critical/40 bg-sev-critical/10 text-sev-critical',
    bar: 'bg-sev-critical',
  },
  HIGH: {
    label: 'High',
    icon: AlertTriangle,
    color: '#fb923c',
    text: 'text-sev-high',
    badge: 'border-sev-high/40 bg-sev-high/10 text-sev-high',
    bar: 'bg-sev-high',
  },
  MEDIUM: {
    label: 'Medium',
    icon: AlertCircle,
    color: '#fbbf24',
    text: 'text-sev-medium',
    badge: 'border-sev-medium/40 bg-sev-medium/10 text-sev-medium',
    bar: 'bg-sev-medium',
  },
  LOW: {
    label: 'Low',
    icon: Info,
    color: '#479dec',
    text: 'text-sev-low',
    badge: 'border-sev-low/40 bg-sev-low/10 text-sev-low',
    bar: 'bg-sev-low',
  },
}

export function severityMeta(severity: string | null | undefined): SeverityMeta {
  const key = (severity || 'LOW').toUpperCase() as Severity
  return SEVERITY_META[key] ?? SEVERITY_META.LOW
}

export function emptySeverityCounts(): SeverityCounts {
  return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
}

export function severitySummary(counts: Partial<SeverityCounts> | null | undefined): string {
  if (!counts) return 'no findings'
  const parts = SEVERITIES.filter((s) => (counts[s] ?? 0) > 0).map((s) => `${counts[s]} ${SEVERITY_META[s].label.toLowerCase()}`)
  return parts.length ? parts.join(', ') : 'no findings'
}

// ---------------------------------------------------------------- CWE

export function cweUrl(cweId: string | null | undefined): string | null {
  if (!cweId) return null
  const match = /(\d+)/.exec(cweId)
  return match ? `https://cwe.mitre.org/data/definitions/${match[1]}.html` : null
}

// ---------------------------------------------------------------- labels

export const LANGUAGE_LABELS: Record<Language, string> = {
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  java: 'Java',
  javascript: 'JavaScript',
  python: 'Python',
  php: 'PHP',
  rust: 'Rust',
}

export const ALL_LANGUAGES = Object.keys(LANGUAGE_LABELS) as Language[]

export function languageLabel(language: string | null | undefined): string {
  if (!language) return 'Unknown'
  return LANGUAGE_LABELS[language as Language] ?? language
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  demo: 'Demo',
}

export function providerLabel(provider: string | null | undefined): string {
  if (!provider) return 'Unknown'
  return PROVIDER_LABELS[provider] ?? provider
}

export const STATUS_LABELS: Record<EvaluationStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export function isTerminalStatus(status: string | null | undefined): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

// ---------------------------------------------------------------- numbers & time

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a'
  return `${value.toFixed(digits)}%`
}

export function formatSignedPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return 'n/a'
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes} min ${rest} s`
}

export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return 'n/a'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'n/a'
  const diff = Math.round((now - then) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff} s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days} d ago`
  return new Date(iso).toLocaleDateString()
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'n/a'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'n/a'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatClock(iso: string | null | undefined): string {
  if (!iso) return '--:--:--'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
