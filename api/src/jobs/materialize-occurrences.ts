import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { materializeOccurrences } from '@/domain/transactions/materialize-occurrences'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

async function ensureOccurrences(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    const series = await db
      .select({ id: transactionSeries.id })
      .from(transactionSeries)
      .where(eq(transactionSeries.active, true))

    for (const s of series) {
      try {
        await materializeOccurrences(s.id)
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
jobManager.registerJob(JOB_CONFIGS.MATERIALIZE_OCCURRENCES, ensureOccurrences)

// Export para execução manual
export async function runMaterializeNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.MATERIALIZE_OCCURRENCES.key)
}
