import { http } from '@/lib/http'

export type AlertEvaluateMode = 'all' | 'upcoming' | 'overdue'

export type EvaluateAlertRulesResult = {
  processed: number
  errors: number
  mode: AlertEvaluateMode
}

export async function evaluateAlertRules(
  slug: string,
  mode: AlertEvaluateMode
): Promise<EvaluateAlertRulesResult> {
  return http<EvaluateAlertRulesResult>(`/organizations/${slug}/alert-rules/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
}
