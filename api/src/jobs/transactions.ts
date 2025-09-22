import { runReports } from '@/domain/reports/transactions'
import { getDistinctOwnerIds } from '@/domain/reports/utils'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

/**
 * Executa o relatório para todos os owners distintos
 */
async function runReportsForAllOwners(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    const ownerIds = await getDistinctOwnerIds()
    if (!ownerIds.length) {
      return {
        success: true,
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      }
    }

    for (const ownerId of ownerIds) {
      try {
        await runReports(ownerId)
        processed++
      } catch {
        errors++
        // Log individual errors but continue processing
      }
    }

    return {
      success: errors === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    }
  } catch {
    return {
      success: false,
      processed,
      errors: errors + 1,
      duration: Date.now() - startTime,
    }
  }
}

// Registrar o job
jobManager.registerJob(JOB_CONFIGS.REPORTS, runReportsForAllOwners)

// Export para execução manual
export async function runAllOwnersNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.REPORTS.key)
}
