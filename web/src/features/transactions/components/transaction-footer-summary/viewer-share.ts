import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { moneyStringToReais, reaisToMoneyString } from '@/lib/currency'

import { resolvePersonShareInstallmentAmountReais } from '../../split-debt-summary.utils'

function installmentHasOpenBalance(item: {
  amount: string
  paidAmount: string
  status: string
}): boolean {
  if (item.status === 'paid' || item.status === 'forgiven') return false
  return moneyStringToReais(item.amount) - moneyStringToReais(item.paidAmount) > 0.005
}

/** Primary “Meu valor” for the authenticated viewer (creditor residual vs debtor share). */
export function resolveViewerMyShare(summary: GetSplitDebtSummary200): {
  amount: string
  label: string
  isDebtorView: boolean
} {
  const viewerOwed = summary.viewerOwedTotal
  const isDebtorView = !summary.viewerIsCreditor && viewerOwed != null
  if (isDebtorView) {
    return {
      amount: viewerOwed,
      label: 'Meu valor',
      isDebtorView: true,
    }
  }
  return {
    amount: summary.myShareTotal,
    label: 'Meu valor',
    isDebtorView: false,
  }
}

/**
 * Current-installment amount in the viewer’s perspective.
 * Debtor: their share of this parcel (not the full purchase installment).
 * Creditor: full current transaction amount.
 */
export function resolveViewerInstallmentAmount(
  summary: GetSplitDebtSummary200,
  fallbackAmount: string
): { amount: string; label: string } | null {
  const current = summary.currentInstallmentNumber
  const total = summary.installmentsTotal
  if (current == null || total == null || total < 2) return null

  const fullParcel = summary.currentTransactionAmount ?? fallbackAmount
  const viewerPerson = summary.persons.find(person => person.isViewer)

  if (!summary.viewerIsCreditor && viewerPerson) {
    const currentSplit =
      viewerPerson.installments.find(item => item.installmentNumber === current) ??
      viewerPerson.installments[0]
    if (currentSplit) {
      const shareReais = resolvePersonShareInstallmentAmountReais({
        totalOwedReais: moneyStringToReais(viewerPerson.totalOwed),
        installmentsTotal: total,
        installmentNumber: current,
        currentSplitAmountReais: moneyStringToReais(currentSplit.amount),
        materializedInstallmentSplits: viewerPerson.installments.length,
        collectLumpSum: currentSplit.collectLumpSum,
      })
      const isLumpSum = Boolean(currentSplit.collectLumpSum)
      return {
        amount: reaisToMoneyString(shareReais),
        label: isLumpSum ? 'Minha cobrança à vista' : `Minha parcela ${current} de ${total}`,
      }
    }
  }

  return {
    amount: fullParcel,
    label: `Parcela ${current} de ${total}`,
  }
}

/**
 * Pending chip for the collapsed footer — scoped to the current installment when
 * known, so a paid parcel 6 does not show “1 pendente” for future parcels 7–10.
 */
export function countPendingForViewer(summary: GetSplitDebtSummary200): number {
  const current = summary.currentInstallmentNumber

  if (!summary.viewerIsCreditor) {
    if (current != null) {
      const viewer = summary.persons.find(person => person.isViewer)
      const row = viewer?.installments.find(item => item.installmentNumber === current)
      if (row) return installmentHasOpenBalance(row) ? 1 : 0
    }
    const remaining = summary.viewerRemainingTotal
    if (remaining == null) return 0
    return moneyStringToReais(remaining) > 0 ? 1 : 0
  }

  if (current != null) {
    return summary.persons.filter(person => {
      const row = person.installments.find(item => item.installmentNumber === current)
      return row ? installmentHasOpenBalance(row) : false
    }).length
  }

  return summary.persons.filter(person => moneyStringToReais(person.totalRemaining) > 0).length
}

export function personDisplayName(person: {
  name: string
  isViewer?: boolean
}): string {
  return person.isViewer ? 'Você' : person.name
}
