import type { GetSplitDebtSummary200PersonsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatMoneyString, moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { computeSplitDebtProgress } from '../split-debt-summary.utils'

const STATUS_LABELS = {
  pending: 'Pendente',
  partial: 'Parcial',
  paid: 'Pago',
  forgiven: 'Perdoado',
} as const

const STATUS_VARIANT = {
  pending: 'warning',
  partial: 'partial',
  paid: 'default',
  forgiven: 'outline',
} as const

interface SplitDebtSummaryProps {
  summary: {
    purchaseTotal: string
    installmentsTotal: number | null
    myShareTotal: string
  }
}

export function SplitDebtSummary({ summary }: SplitDebtSummaryProps) {
  const hasInstallments = (summary.installmentsTotal ?? 0) > 1

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Resumo da divisão
          </p>
          {hasInstallments && (
            <p className="mt-1 text-sm text-slate-600">
              Compra de {formatMoneyString(summary.purchaseTotal)} em{' '}
              {summary.installmentsTotal} parcelas
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Meu valor total</p>
          <p className="text-base font-semibold tabular-nums text-slate-900">
            {formatMoneyString(summary.myShareTotal)}
          </p>
        </div>
      </div>
    </div>
  )
}

interface PersonSplitDebtDetailsProps {
  person: GetSplitDebtSummary200PersonsItem
  currentTransactionId: string
  installmentsTotal: number | null
}

export function PersonSplitDebtDetails({
  person,
  currentTransactionId,
  installmentsTotal,
}: PersonSplitDebtDetailsProps) {
  const progress = computeSplitDebtProgress(person.totalOwed, person.totalPaid)
  const showInstallmentPlan = (installmentsTotal ?? 0) > 1 && person.installments.length > 1

  return (
    <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
      <p className="text-sm text-slate-600">
        Total devido:{' '}
        <strong className="tabular-nums text-slate-900">
          {formatMoneyString(person.totalOwed)}
        </strong>
      </p>

      <div className="space-y-2">
        <div className="flex h-2 overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progress.paidPercent}%` }}
          />
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600">
          <span>
            Pago:{' '}
            <strong className="tabular-nums text-emerald-700">
              {formatCurrency(progress.paidReais)}
            </strong>
          </span>
          <span>
            Falta:{' '}
            <strong className="tabular-nums text-amber-700">
              {formatCurrency(progress.remainingReais)}
            </strong>
          </span>
        </div>
      </div>

      {showInstallmentPlan && (
        <ul className="space-y-1.5">
          {person.installments.map(installment => {
            const isCurrent = installment.transactionId === currentTransactionId
            const remaining =
              moneyStringToReais(installment.amount) - moneyStringToReais(installment.paidAmount)

            return (
              <li
                key={installment.splitId}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm',
                  isCurrent && 'bg-white ring-1 ring-slate-200'
                )}
              >
                <span className="text-slate-600">
                  Parcela {installment.installmentNumber}/{installmentsTotal}
                  {isCurrent && (
                    <span className="ml-1 text-xs font-medium text-slate-500">(esta)</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-slate-800">
                    {formatMoneyString(installment.amount)}
                  </span>
                  <Badge
                    variant={STATUS_VARIANT[installment.status]}
                    className="text-[10px] uppercase"
                  >
                    {installment.status === 'partial'
                      ? `Falta ${formatMoneyString(reaisToMoneyString(remaining))}`
                      : STATUS_LABELS[installment.status]}
                  </Badge>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
