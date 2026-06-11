import { processAllInvestmentMatches } from '@/domain/alerts/delivery/process-investment-match'
import { processAllReminderMatches } from '@/domain/alerts/delivery/process-reminder-match'
import { processAllRuleMatches } from '@/domain/alerts/delivery/process-rule-match'
import {
  evaluateInvestmentReminders,
  previewInvestmentAlerts,
} from '@/domain/alerts/evaluator/evaluate-investment-reminders'
import {
  evaluateReminders,
  previewReminderAlerts,
} from '@/domain/alerts/evaluator/evaluate-reminders'
import {
  evaluateTransactionRules,
  previewTransactionRuleAlerts,
} from '@/domain/alerts/evaluator/evaluate-transaction-rules'
import { logger } from '@/lib/logger'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult, JobRunOptions } from './types'

async function evaluateAlerts(userId?: string, options?: JobRunOptions): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    logger.info('🚀 Iniciando job de avaliação de alertas...')

    const evaluatorOptions = options?.skipTimeCheck ? { skipTimeCheck: true as const } : undefined

    const reminderMatches = await evaluateReminders(userId, evaluatorOptions)
    const ruleMatches = await evaluateTransactionRules(userId, evaluatorOptions)
    const investmentMatches = await evaluateInvestmentReminders(userId, evaluatorOptions)

    if (
      reminderMatches.length === 0 &&
      ruleMatches.length === 0 &&
      investmentMatches.length === 0
    ) {
      logger.info('ℹ️ Nenhum alerta para disparar')
      return {
        success: true,
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      }
    }

    const reminderResult = await processAllReminderMatches(reminderMatches)
    const ruleResult = await processAllRuleMatches(ruleMatches)
    const investmentResult = await processAllInvestmentMatches(investmentMatches)

    processed =
      reminderResult.processed + ruleResult.processed + investmentResult.processed
    errors = reminderResult.errors + ruleResult.errors + investmentResult.errors

    return {
      success: errors === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    logger.error(`Erro no job de avaliação de alertas: ${String(error)}`)
    return {
      success: false,
      processed,
      errors: errors + 1,
      duration: Date.now() - startTime,
    }
  }
}

jobManager.registerJob(JOB_CONFIGS.EVALUATE_ALERTS, evaluateAlerts)

export async function previewEvaluateAlerts(orgId?: string, userId?: string) {
  const [reminders, rules, investments] = await Promise.all([
    previewReminderAlerts(orgId, userId),
    previewTransactionRuleAlerts(orgId, userId),
    previewInvestmentAlerts(orgId, userId),
  ])
  return {
    reminders: reminders.items,
    rules: rules.items,
    investments: investments.items,
  }
}
