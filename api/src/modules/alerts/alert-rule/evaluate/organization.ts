import type { AlertRuleRecord } from '../../alert-rule.repository'
import type { SplitRepository } from '@/modules/splits/split.repository'

import { resolveDaysUntilDueForTransaction } from '../due'
import { loadPendingTransactions } from '../loaders'
import type { AlertEvaluateMode, EvaluateOrganizationOptions } from '../types'
import type { EvaluateNotifyDeps } from './deps'
import { evaluateOwnerResidualAlerts } from './owner-residual'
import { evaluateSplitOverdueReminders, evaluateSplitReminders } from './splits'
import {
  evaluateTargetedOverdueTransaction,
  evaluateTargetedTransaction,
} from './targeted'

export async function evaluateOrganizationRules(
  deps: EvaluateNotifyDeps & { splitRepository: SplitRepository },
  organizationId: string,
  rules: AlertRuleRecord[],
  mode: AlertEvaluateMode,
  options?: EvaluateOrganizationOptions
): Promise<{ processed: number; errors: number }> {
  let processed = 0
  const skipDedupe = options?.skipOverdueThrottle === true

  const pendingTransactions = await loadPendingTransactions(organizationId)
  const notifyingSplits = await deps.splitRepository.listNotifyEnabledPending(organizationId)
  const transactionIdsWithSplits = new Set(notifyingSplits.map(split => split.transactionId))

  for (const transaction of pendingTransactions) {
    const daysUntilDue = resolveDaysUntilDueForTransaction(transaction)

    if (transactionIdsWithSplits.has(transaction.id)) {
      continue
    }

    if (transaction.notifyEnabled && transaction.notifyTargetType) {
      if (
        options?.targetUserId &&
        transaction.notifyTargetType === 'member' &&
        transaction.notifyUserId !== options.targetUserId
      ) {
        continue
      }
      if (options?.targetUserId && transaction.notifyTargetType === 'contact') {
        continue
      }

      if (daysUntilDue >= 0 && mode !== 'overdue') {
        processed += await evaluateTargetedTransaction(deps, {
          rules,
          transaction,
          daysUntilDue,
          skipDedupe,
          limitToUserId: options?.targetUserId,
        })
      } else if (daysUntilDue < 0 && mode !== 'upcoming') {
        processed += await evaluateTargetedOverdueTransaction(deps, {
          rules,
          transaction,
          daysUntilDue,
          skipDedupe,
          limitToUserId: options?.targetUserId,
        })
      }
    }
  }

  if (mode !== 'overdue') {
    processed += await evaluateSplitReminders(deps, {
      rules,
      splits: notifyingSplits,
      targetUserId: options?.targetUserId,
      skipDedupe,
    })
  }

  if (mode !== 'upcoming') {
    processed += await evaluateSplitOverdueReminders(deps, {
      rules,
      splits: notifyingSplits,
      targetUserId: options?.targetUserId,
      skipDedupe,
    })
  }

  processed += await evaluateOwnerResidualAlerts(deps, {
    organizationId,
    rules,
    mode,
    delegatedTransactionIds: transactionIdsWithSplits,
    targetUserId: options?.targetUserId,
    skipDedupe,
  })

  return { processed, errors: 0 }
}
