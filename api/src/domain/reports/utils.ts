import { isNotNull } from 'drizzle-orm'

import { db } from '@/db'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { logger } from '@/http/utils/logger'

/**
 * Busca todos os ownerIds distintos que tenham pelo menos 1 transação
 */
export async function getDistinctOwnerIds(): Promise<string[]> {
  try {
    // SELECT DISTINCT owner_id FROM transactions WHERE owner_id IS NOT NULL;
    const rows = await db
      .select({ ownerId: transactionSeries.ownerId })
      .from(transactionSeries)
      .where(isNotNull(transactionSeries.ownerId))
      .groupBy(transactionSeries.ownerId) // drizzle usa groupBy p/ DISTINCT

    const ids = rows.map(r => r.ownerId).filter((v): v is string => !!v)
    logger.info({ count: ids.length }, '[reports] owners distintos encontrados')
    return ids
  } catch (err) {
    logger.error({ err }, '[reports] erro ao obter owners distintos')
    return []
  }
}
