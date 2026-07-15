import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { formatMoneyString, reaisToMoneyString } from '@/lib/currency'

import {
  countPendingForViewer,
  resolveViewerMyShare,
} from './viewer-share'

export type SummaryHeaderChip = {
  text: string
  tone?: 'neutral' | 'warning' | 'success'
}

export type SummaryHeader = {
  label: string
  primary: string
  chips: SummaryHeaderChip[]
}

export function collapsedHeader(
  splitDebtSummary: GetSplitDebtSummary200 | undefined,
  installmentContext: GetSplitDebtSummary200 | undefined,
  amount: number,
  installmentNumber?: number | null,
  installmentsTotal?: number | null
): SummaryHeader {
  if (splitDebtSummary) {
    const share = resolveViewerMyShare(splitDebtSummary)
    const pendingCount = countPendingForViewer(splitDebtSummary)
    const current = splitDebtSummary.currentInstallmentNumber ?? installmentNumber ?? null
    const total = splitDebtSummary.installmentsTotal ?? installmentsTotal ?? null
    const chips: SummaryHeaderChip[] = []
    if (current != null && total != null && total > 1) {
      chips.push({ text: `${current} de ${total}` })
    }
    if (pendingCount > 0) {
      chips.push({
        text:
          share.isDebtorView
            ? 'A pagar'
            : pendingCount === 1
              ? '1 pendente'
              : `${pendingCount} pendentes`,
        tone: 'warning',
      })
    }
    return {
      label: share.label,
      primary: formatMoneyString(share.amount),
      chips,
    }
  }

  const hasInstallments = (installmentContext?.installmentsTotal ?? installmentsTotal ?? 0) > 1
  const current = installmentContext?.currentInstallmentNumber ?? installmentNumber ?? null
  const total = installmentContext?.installmentsTotal ?? installmentsTotal ?? null
  const value =
    hasInstallments && installmentContext?.currentTransactionAmount
      ? installmentContext.currentTransactionAmount
      : reaisToMoneyString(amount)

  if (hasInstallments && current != null && total != null) {
    return {
      label: `Parcela ${current} de ${total}`,
      primary: formatMoneyString(value),
      chips: [],
    }
  }

  return { label: 'Total', primary: formatMoneyString(value), chips: [] }
}
