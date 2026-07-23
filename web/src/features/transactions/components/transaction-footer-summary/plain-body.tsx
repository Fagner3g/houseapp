import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { formatMoneyString, reaisToMoneyString } from '@/lib/currency'

import { InstallmentSeriesProgress } from '../installment-series-progress'
import { SummaryMetric } from './shared'

type PlainBodyProps = {
  installmentSummary?: GetSplitDebtSummary200
  amount: number
  installmentNumber?: number | null
  installmentsTotal?: number | null
}

/** Expanded extras only — primary total/parcel lives in the header. */
export function PlainSummaryBody({
  installmentSummary,
  amount,
  installmentNumber,
  installmentsTotal,
}: PlainBodyProps) {
  const hasInstallments = (installmentSummary?.installmentsTotal ?? installmentsTotal ?? 0) > 1
  const currentInstallment =
    installmentSummary?.currentInstallmentNumber ?? installmentNumber ?? null
  const totalInstallments = installmentSummary?.installmentsTotal ?? installmentsTotal ?? null
  const installmentAmount =
    hasInstallments && installmentSummary?.currentTransactionAmount
      ? installmentSummary.currentTransactionAmount
      : reaisToMoneyString(amount)
  const purchaseTotal = installmentSummary?.purchaseTotal
  const purchaseTotalIsEstimate = installmentSummary?.purchaseTotalIsEstimate ?? false
  const showPurchaseTotal =
    hasInstallments && purchaseTotal != null && purchaseTotal !== installmentAmount

  if (!showPurchaseTotal && !(hasInstallments && currentInstallment != null && totalInstallments != null)) {
    return null
  }

  return (
    <div className="space-y-3">
      {showPurchaseTotal && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <SummaryMetric
            label={purchaseTotalIsEstimate ? 'Compra total (estimado)' : 'Compra total'}
            value={formatMoneyString(purchaseTotal)}
            emphasize
          />
        </div>
      )}
      {hasInstallments && currentInstallment != null && totalInstallments != null && (
        <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200/70">
          <InstallmentSeriesProgress current={currentInstallment} total={totalInstallments} />
        </div>
      )}
    </div>
  )
}
