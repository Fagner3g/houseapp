import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { moneyStringToReais } from '@/lib/currency'

import { resolveViewerMyShare } from './viewer-share'

/** True when the expanded panel would show more than the header already covers. */
export function hasExpandableSummaryDetails(
  splitDebtSummary: GetSplitDebtSummary200 | undefined,
  installmentSummary: GetSplitDebtSummary200 | undefined,
  installmentsTotal?: number | null
): boolean {
  if (splitDebtSummary) {
    if (splitDebtSummary.persons.length > 0) return true
    if ((splitDebtSummary.installmentsTotal ?? installmentsTotal ?? 0) > 1) return true
    // Header shows Meu valor; body adds Compra total.
    return moneyStringToReais(resolveViewerMyShare(splitDebtSummary).amount) >= 0.005
  }

  return (installmentSummary?.installmentsTotal ?? installmentsTotal ?? 0) > 1
}
