import { eq } from 'drizzle-orm'
import * as cron from 'node-cron'

import { db } from '@/db'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { materializeOccurrences } from '@/domain/transactions/materialize-occurrences'
import { logger } from '@/http/utils/logger'

async function ensureOccurrences() {
  const series = await db
    .select({ id: transactionSeries.id })
    .from(transactionSeries)
    .where(eq(transactionSeries.active, true))

  for (const s of series) {
    try {
      await materializeOccurrences(s.id)
    } catch (err) {
      logger.error({ err, seriesId: s.id }, 'failed to materialize occurrences')
    }
  }
}

const JOB_KEY = 'transactions:materialize'
const TZ = 'America/Sao_Paulo'

const g = globalThis as unknown as { __cronTasks?: Map<string, cron.ScheduledTask> }
g.__cronTasks ??= new Map()

if (!g.__cronTasks.has(JOB_KEY)) {
  const task = cron.schedule(
    '0 3 * * *',
    async () => {
      try {
        await ensureOccurrences()
      } catch (err) {
        logger.error({ err }, 'cron materialize occurrences failed')
      }
    },
    { timezone: TZ }
  )
  g.__cronTasks.set(JOB_KEY, task)
  task.start()
  logger.info('cron materialize occurrences scheduled')
} else {
  logger.info({ JOB_KEY }, 'materialize occurrences cron already scheduled')
}

export async function runMaterializeNow() {
  await ensureOccurrences()
}
