import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { cards } from '@/db/schemas/cards'

import type { ImportStatementBody } from './statement.schema'
import {
  applySplitHintsToTransactions,
  countInferredSplits,
  inferModeFromAmounts,
  inferSplitsFromCardOwners,
  normalizeTitleForSplit,
  sanitizeSplitHint,
  type StatementSplitHint,
} from './statement-split-inferrer.logic'

export type { StatementSplitHint }
export {
  applySplitHintsToTransactions,
  countInferredSplits,
  inferModeFromAmounts,
  inferSplitsFromCardOwners,
  normalizeTitleForSplit,
  sanitizeSplitHint,
}

export async function inferStatementSplits(
  accountId: string,
  userId: string,
  items: ImportStatementBody['transactions']
): Promise<ImportStatementBody['transactions']> {
  const accountCards = await db
    .select({
      lastFourDigits: cards.lastFourDigits,
      userId: cards.userId,
    })
    .from(cards)
    .where(eq(cards.accountId, accountId))

  const cardUserByLastFour = new Map<string, string | null>()
  for (const card of accountCards) {
    if (card.lastFourDigits) {
      cardUserByLastFour.set(card.lastFourDigits, card.userId)
    }
  }

  return inferSplitsFromCardOwners(userId, items, cardUserByLastFour) as ImportStatementBody['transactions']
}
