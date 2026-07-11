import { centavosToString } from '@/core/money'
import type { SplitRepository } from '@/modules/splits/split.repository'

import { keepSoonestUpcomingInstallmentSplits } from '../keep-soonest-installment-splits'
import { resolveDaysUntilDueForSplit, resolveDaysUntilDueForTransaction } from './due'
import { loadPendingTransactions } from './loaders'
import { splitMatchesTarget, transactionMatchesTarget } from './manual-targets'
import type { AlertEvaluateMode, ManualAlertItem } from './types'

export async function collectManualAlertItems(
  splitRepository: SplitRepository,
  organizationId: string,
  targetKey: string,
  mode: AlertEvaluateMode
): Promise<ManualAlertItem[]> {
  const items: ManualAlertItem[] = []
  const pendingTransactions = await loadPendingTransactions(organizationId)
  const activeSplitsRaw = await splitRepository.listActivePendingSplits(organizationId)
  const activeSplits =
    mode === 'overdue'
      ? activeSplitsRaw
      : keepSoonestUpcomingInstallmentSplits(activeSplitsRaw, split =>
          resolveDaysUntilDueForSplit(split)
        )
  const transactionIdsWithSplits = new Set(activeSplitsRaw.map(split => split.transactionId))

  for (const transaction of pendingTransactions) {
    if (transactionIdsWithSplits.has(transaction.id)) continue
    if (!transaction.notifyEnabled || !transaction.notifyTargetType) continue
    if (!transactionMatchesTarget(transaction, targetKey)) continue
    if (transaction.notifyTargetType === 'contact') continue

    const daysUntilDue = resolveDaysUntilDueForTransaction(transaction)

    if (daysUntilDue >= 0 && mode !== 'overdue') {
      items.push({ transactionId: transaction.id, daysUntilDue, kind: 'upcoming' })
    } else if (daysUntilDue < 0 && mode !== 'upcoming') {
      items.push({
        transactionId: transaction.id,
        daysUntilDue,
        kind: 'overdue',
        overdueDays: Math.abs(daysUntilDue),
      })
    }
  }

  for (const split of activeSplits) {
    if (!splitMatchesTarget(split, targetKey)) continue

    const daysUntilDue = resolveDaysUntilDueForSplit(split)
    const splitAmount = centavosToString(split.amount)

    if (daysUntilDue >= 0 && mode !== 'overdue') {
      items.push({
        transactionId: split.transactionId,
        daysUntilDue,
        kind: 'upcoming',
        amountOverride: splitAmount,
        isSplit: true,
        splitId: split.id,
      })
    } else if (daysUntilDue < 0 && mode !== 'upcoming') {
      items.push({
        transactionId: split.transactionId,
        daysUntilDue,
        kind: 'overdue',
        overdueDays: Math.abs(daysUntilDue),
        amountOverride: splitAmount,
        isSplit: true,
        splitId: split.id,
      })
    }
  }

  return items
}
