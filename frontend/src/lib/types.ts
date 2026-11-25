// TypeScript mirror of the backend API contract (build-plan.md section 5.10).

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type Language = 'c' | 'cpp' | 'csharp' | 'java' | 'javascript' | 'python' | 'php' | 'rust'

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'demo'

export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type FindingStatus = 'open' | 'unresolved' | 'newly_introduced'

export type SeverityCounts = Record<Severity, number>

// ---------------------------------------------------------------- health / settings

export interface HealthResponse {
  status: 'healthy' | 'degraded' | string
  version: string
  environment: string
  python_version: string
  demo_mode: boolean
  components: {
    database: { status: string; type: string; message?: string }
    ai_providers: {
      openai: 'configured' | 'not_configured'
      anthropic: 'configured' | 'not_configured'
      google: 'configured' | 'not_configured'
      demo: 'available'
    }
    security_scanners: {
      builtin: string
      bandit: 'available' | 'not_installed' | 'disabled' | string
      semgrep: 'not_integrated' | string
    }
  }
}

export interface ProviderInfo {
  id: ProviderId
  label: string
  configured: boolean
  default_model: string
  effective: 'live' | 'demo-fallback' | 'demo-forced'
}

export interface SettingsResponse {
  environment: string
  demo_mode: boolean
  default_ai_provider: string
  providers: ProviderInfo[]
  scanners: Record<string, string>
  supported_languages: Language[]
  ai_providers: Record<string, boolean>
  rounds: { min: number; max: number; default: number }
  limits: { max_code_chars: number; max_task_chars: number }
}

// ---------------------------------------------------------------- scan / samples

export interface Sample {
  id: string
  language: Language
  title: string
  cwes: string[]
  task: string
  code: string
}

export interface ScanFinding {
  rule_id: string
  analyzer: string
  cwe_id: string | null
  cwe_name: string | null
  cwe_url: string | null
  severity: Severity
  confidence: string | null
  title: string
  description: string
  remediation: string | null
  start_line: number | null
  end_line: number | null
  code_snippet: string | null
  corroborated_by: string[]
}

export interface ScanRequest {
  code: string
  language: Language
}

export interface ScanResponse {
  label: 0 | 1
  is_secure: boolean
  findings: ScanFinding[]
  severity_counts: SeverityCounts
  analyzers_run: string[]
  errors: string[]
}

// ---------------------------------------------------------------- evaluations

export interface CreateEvaluationRequest {
  task: string
  language: Language
  ai_provider?: ProviderId
  ai_model?: string | null
  reflexion_rounds?: number
  code?: string | null
  ai_config?: Record<string, string | number | boolean | null>
}

export interface Finding extends ScanFinding {
  id: string
  status: FindingStatus
}

export interface FindingSummary {
  rule_id: string | null
  cwe_id: string | null
  title: string | null
  severity: Severity | null
}

export interface FindingComparison {
  fixed: FindingSummary[]
  new: FindingSummary[]
  unresolved: FindingSummary[]
}

export interface CodeVersion {
  id: string
  version: string // t0, t1, ...
  round_number: number
  code: string
  security_label: 0 | 1 | null
  is_secure: boolean | null
  findings_count: number
  severity_counts: SeverityCounts
  findings: Finding[]
  diff: string | null
  explanation: string | null
  comparison: FindingComparison
  scan_error?: string | null
  generation_time_seconds: number | null
  tokens_used: number | null
  created_at: string
}

export interface RoundMetric {
  round: number
  version: string
  repair_rate: number
  regression_rate: number
  net_gain: number
  repair_defined: boolean
  regression_defined: boolean
  from_label: number
  to_label: number
}

export interface EvaluationDetail {
  id: string
  task: string
  language: Language
  ai_provider: string
  ai_model: string
  ai_config: Record<string, unknown>
  is_demo: boolean
  status: EvaluationStatus
  error_message: string | null
  requested_rounds: number
  completed_rounds: number
  stopped_early: boolean
  baseline_secure: boolean | null
  final_secure: boolean | null
  total_findings_t0: number
  total_findings_final: number
  findings_fixed: number
  findings_new: number
  started_at: string | null
  completed_at: string | null
  total_duration_seconds: number | null
  total_tokens_used: number
  created_at: string
  updated_at: string
  code_versions: CodeVersion[]
  metrics: RoundMetric[]
}

export interface EvaluationSummary {
  id: string
  task: string
  language: Language
  ai_provider: string
  ai_model: string
  is_demo: boolean
  status: EvaluationStatus
  requested_rounds: number
  completed_rounds: number
  baseline_secure: boolean | null
  final_secure: boolean | null
  total_findings_t0: number
  total_findings_final: number
  findings_fixed: number
  findings_new: number
  created_at: string
  completed_at: string | null
  total_duration_seconds: number | null
}

export interface EvaluationList {
  total: number
  page: number
  page_size: number
  items: EvaluationSummary[]
}

export interface EvaluationAction {
  message: string
  evaluation_id: string
  status: string | null
}

export interface ListEvaluationsParams {
  page?: number
  page_size?: number
  status?: EvaluationStatus
  language?: Language
}

// ---------------------------------------------------------------- analytics

export interface ReflexionCurvePoint {
  round: number
  version: string
  repair_rate: number
  regression_rate: number
  net_gain: number
  secure_rate: number
  repair_defined: boolean
  regression_defined: boolean
}

export interface SeverityDistributionItem {
  severity: Severity
  t0: number
  final: number
}

export interface SeverityByRoundItem extends SeverityCounts {
  round: number
  version: string
}

export interface CweBreakdownItem {
  cwe_id: string
  cwe_name: string | null
  found: number
  fixed: number
  remaining: number
}

export interface RecentEvaluation {
  id: string
  task: string
  language: Language
  ai_provider: string
  status: EvaluationStatus
  created_at: string
  total_findings_t0: number
  total_findings_final: number
  final_secure: boolean | null
}

export interface DashboardResponse {
  total_evaluations: number
  completed_evaluations: number
  total_code_versions: number
  total_security_findings: number
  baseline_secure_rate: number
  final_secure_rate: number
  average_repair_rate: number
  average_regression_rate: number
  average_net_gain: number
  metrics_flags: { repair_defined: boolean; regression_defined: boolean }
  reflexion_curve: ReflexionCurvePoint[]
  severity_distribution: SeverityDistributionItem[]
  severity_by_round: SeverityByRoundItem[]
  cwe_breakdown: CweBreakdownItem[]
  most_common_cwes: { cwe_id: string; cwe_name: string | null; count: number }[]
  evaluations_by_language: Record<string, number>
  evaluations_by_status: Record<string, number>
  recent_evaluations: RecentEvaluation[]
}

// ---------------------------------------------------------------- errors

export interface FieldError {
  field: string
  message: string
}
