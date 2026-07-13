import { stripInstallmentSuffix } from '@/lib/normalize-merchant-title'

/** Card may be installmentized; lump-sum debtor charge should not show Parcela N/M. */
export function pendingSplitDisplayTitle(title: string, collectLumpSum: boolean): string {
  return collectLumpSum ? stripInstallmentSuffix(title) : title
}
