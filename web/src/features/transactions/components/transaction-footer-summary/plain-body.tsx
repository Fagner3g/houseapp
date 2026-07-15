import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { formatMoneyString, reaisToMoneyString } from '@/lib/currency'

import { InstallmentSeriesProgress } from '../installment-series-progress'
import { SummaryMetric, TransactionStatusBadge } from './shared'

type PlainBodyProps = {
  installmentSummary?: GetSplitDebtSummary200
  amount: number
  status: 'paid' | 'partial' | 'pending'
  showStatus: boolean
  accountName?: string
  installmentNumber?: number | null
  installmentsTotal?: number | null
}

export function PlainSummaryBody({
  installmentSummary,
  amount,
  status,
  showStatus,
  accountName,
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <SummaryMetric
          label={
            hasInstallments && currentInstallment != null && totalInstallments != null
              ? `Parcela ${currentInstallment} de ${totalInstallments}`
              : 'Total'
          }
          value={formatMoneyString(installmentAmount)}
          emphasize
        />
        {showPurchaseTotal && (
          <SummaryMetric
            label={purchaseTotalIsEstimate ? 'Compra total (estimado)' : 'Compra total'}
            value={formatMoneyString(purchaseTotal)}
          />
        )}
        {showStatus && (
          <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200/70">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Status</p>
            <TransactionStatusBadge status={status} />
          </div>
        )}
      </div>
      {hasInstallments && currentInstallment != null && totalInstallments != null && (
        <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200/70">
          <InstallmentSeriesProgress current={currentInstallment} total={totalInstallments} />
        </div>
      )}
      {accountName && (
        <p className="px-0.5 text-xs text-slate-500">
          Conta · <span className="font-medium text-slate-700">{accountName}</span>
        </p>
      )}
    </div>
  )
}
