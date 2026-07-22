import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { formatMoneyString, moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { InstallmentSeriesProgress } from '../installment-series-progress'
import { SPLIT_STATUS_LABELS, SPLIT_STATUS_VARIANT } from '../splits/split-status'
import { SummaryMetric, TransactionStatusBadge } from './shared'
import {
  personDisplayName,
  resolveViewerInstallmentAmount,
  resolveViewerMyShare,
} from './viewer-share'

type SplitBodyProps = {
  splitDebtSummary: GetSplitDebtSummary200
  amount: number
  status: 'paid' | 'partial' | 'pending'
  showStatus: boolean
  accountName?: string
  installmentNumber?: number | null
  installmentsTotal?: number | null
}

export function SplitSummaryBody({
  splitDebtSummary,
  amount,
  status,
  showStatus,
  accountName,
  installmentNumber,
  installmentsTotal,
}: SplitBodyProps) {
  const hasInstallments = (splitDebtSummary.installmentsTotal ?? installmentsTotal ?? 0) > 1
  const currentInstallment =
    splitDebtSummary.currentInstallmentNumber ?? installmentNumber ?? null
  const totalInstallments = splitDebtSummary.installmentsTotal ?? installmentsTotal ?? null
  const share = resolveViewerMyShare(splitDebtSummary)
  const showMyShare = moneyStringToReais(share.amount) >= 0.005
  const installmentMetric = resolveViewerInstallmentAmount(
    {
      ...splitDebtSummary,
      currentInstallmentNumber:
        splitDebtSummary.currentInstallmentNumber ?? installmentNumber ?? null,
      installmentsTotal: splitDebtSummary.installmentsTotal ?? installmentsTotal ?? null,
    },
    reaisToMoneyString(amount)
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {showMyShare ? (
          <SummaryMetric
            label={share.label}
            value={formatMoneyString(share.amount)}
            emphasize
          />
        ) : null}
        <SummaryMetric
          label={
            splitDebtSummary.purchaseTotalIsEstimate ? 'Compra total (estimado)' : 'Compra total'
          }
          value={formatMoneyString(splitDebtSummary.purchaseTotal)}
          emphasize={!showMyShare}
        />
        {installmentMetric ? (
          <SummaryMetric
            label={installmentMetric.label}
            value={formatMoneyString(installmentMetric.amount)}
            className="col-span-2 sm:col-span-1"
          />
        ) : showStatus ? (
          <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200/70">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Status</p>
            <TransactionStatusBadge status={status} />
          </div>
        ) : null}
      </div>

      {splitDebtSummary.persons.length > 0 && (
        <div className="space-y-1.5">
          <p className="px-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Divisões
          </p>
          <div className="space-y-1.5">
            {splitDebtSummary.persons.map(person => {
              const remainingReais = moneyStringToReais(person.totalRemaining)
              const hasRemaining = remainingReais > 0
              return (
                <div
                  key={person.key ?? person.name}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1',
                    person.isViewer ? 'ring-slate-300' : 'ring-slate-200/70'
                  )}
                >
                  <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                    {personDisplayName(person)}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {person.installments.some(item => item.collectLumpSum) && (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        à vista
                      </Badge>
                    )}
                    {!person.installments.some(item => item.collectLumpSum) &&
                      person.installments.length > 1 && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          parcelado
                        </Badge>
                      )}
                    {hasRemaining ? (
                      <span className="text-sm font-medium tabular-nums text-amber-700">
                        Falta {formatMoneyString(person.totalRemaining)}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-emerald-700">Quitado</span>
                    )}
                    <Badge
                      variant={SPLIT_STATUS_VARIANT[person.status]}
                      className="text-[10px] uppercase"
                    >
                      {SPLIT_STATUS_LABELS[person.status]}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hasInstallments && currentInstallment != null && totalInstallments != null && (
        <div className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200/70">
          <InstallmentSeriesProgress current={currentInstallment} total={totalInstallments} />
        </div>
      )}

      {(showStatus && hasInstallments) || accountName ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-0.5 pt-0.5">
          {showStatus && hasInstallments && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Status</span>
              <TransactionStatusBadge status={status} />
            </div>
          )}
          {accountName && (
            <p className="text-xs text-slate-500">
              Conta · <span className="font-medium text-slate-700">{accountName}</span>
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
