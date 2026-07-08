import { formatCentsString, moneyStringToReais, reaisToMoneyString } from '@/lib/currency'

import type { ParsedTransactionReviewItem } from '../components/import-review-types'
import type { ImportReviewMerchantGroup } from './aggregate-import-review-merchants'

export type ImportReviewSignedAmount = {
  label: string
  className: string
}

export function getImportReviewSignedAmount(
  amount: string | null | undefined,
  type: 'income' | 'expense'
): ImportReviewSignedAmount {
  const formatted = formatCentsString(amount)

  if (type === 'income') {
    return { label: `+ ${formatted}`, className: 'text-emerald-600' }
  }

  return { label: `- ${formatted}`, className: 'text-rose-600' }
}

export function getImportReviewGroupSignedAmount(
  groupItems: ParsedTransactionReviewItem[],
  group: Pick<ImportReviewMerchantGroup, 'total' | 'uniformType'>
): ImportReviewSignedAmount {
  if (group.uniformType) {
    return getImportReviewSignedAmount(group.total, group.uniformType)
  }

  const netReais = groupItems.reduce((sum, item) => {
    const amount = moneyStringToReais(item.amount)
    return sum + (item.type === 'income' ? -amount : amount)
  }, 0)

  if (netReais === 0) {
    return { label: formatCentsString('0'), className: 'text-slate-500' }
  }

  if (netReais < 0) {
    return getImportReviewSignedAmount(reaisToMoneyString(Math.abs(netReais)), 'income')
  }

  return getImportReviewSignedAmount(reaisToMoneyString(netReais), 'expense')
}
