import type { ReactNode } from 'react'

import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import {
  formatMoneyString,
  moneyStringToReais,
  reaisToMoneyString,
} from '@/lib/currency'
import { cn } from '@/lib/utils'

const SPLIT_STATUS_LABELS = {
  pending: 'Pendente',
  partial: 'Parcial',
  paid: 'Pago',
  forgiven: 'Perdoado',
} as const

const SPLIT_STATUS_VARIANT = {
  pending: 'warning',
  partial: 'partial',
  paid: 'default',
  forgiven: 'outline',
} as const

const TRANSACTION_STATUS_LABELS = {
  paid: 'Pago',
  partial: 'Parcial',
  pending: 'Pendente',
} as const

const TRANSACTION_STATUS_VARIANT = {
  paid: 'default',
  partial: 'partial',
  pending: 'warning',
} as const

function TransactionStatusBadge({ status }: { status: 'paid' | 'partial' | 'pending' }) {
  return (
    <Badge variant={TRANSACTION_STATUS_VARIANT[status]} className="mt-0.5 text-[10px] uppercase">
      {TRANSACTION_STATUS_LABELS[status]}
    </Badge>
  )
}

function SummaryMetric({
  label,
  value,
  emphasize = false,
  className,
}: {
  label: string
  value: ReactNode
  emphasize?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          'tabular-nums text-slate-900',
          emphasize ? 'text-base font-semibold' : 'text-sm font-medium'
        )}
      >
        {value}
      </p>
    </div>
  )
}

interface TransactionFooterSummaryProps {
  splitDebtSummary?: GetSplitDebtSummary200
  installmentSummary?: GetSplitDebtSummary200
  amount: number
  status: 'paid' | 'partial' | 'pending'
  showStatus: boolean
  accountName?: string
  installmentNumber?: number | null
  installmentsTotal?: number | null
  isEdit?: boolean
}

export function TransactionFooterSummary({
  splitDebtSummary,
  installmentSummary,
  amount,
  status,
  showStatus,
  accountName,
  installmentNumber,
  installmentsTotal,
}: TransactionFooterSummaryProps) {
  const installmentContext = installmentSummary ?? splitDebtSummary
  const hasInstallments = (installmentContext?.installmentsTotal ?? installmentsTotal ?? 0) > 1
  const currentInstallment =
    installmentContext?.currentInstallmentNumber ?? installmentNumber ?? null
  const totalInstallments = installmentContext?.installmentsTotal ?? installmentsTotal ?? null

  if (splitDebtSummary) {
    const installmentAmount =
      splitDebtSummary.currentTransactionAmount ?? reaisToMoneyString(amount)

    return (
      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <SummaryMetric
            label="Meu valor"
            value={formatMoneyString(splitDebtSummary.myShareTotal)}
            emphasize
          />
          <SummaryMetric
            label={
              splitDebtSummary.purchaseTotalIsEstimate ? 'Compra total (estimado)' : 'Compra total'
            }
            value={formatMoneyString(splitDebtSummary.purchaseTotal)}
          />
          {hasInstallments && currentInstallment != null && totalInstallments != null ? (
            <SummaryMetric
              label={`Parcela ${currentInstallment} de ${totalInstallments}`}
              value={formatMoneyString(installmentAmount)}
            />
          ) : showStatus ? (
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <TransactionStatusBadge status={status} />
            </div>
          ) : null}
        </div>

        {splitDebtSummary.persons.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Divisões</p>
            {splitDebtSummary.persons.map(person => {
              const remainingReais = moneyStringToReais(person.totalRemaining)
              const hasRemaining = remainingReais > 0
              return (
                <div
                  key={person.key ?? person.name}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                    {person.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {hasRemaining ? (
                      <span className="text-sm tabular-nums text-amber-700">
                        Falta {formatMoneyString(person.totalRemaining)}
                      </span>
                    ) : (
                      <span className="text-sm text-emerald-700">Quitado</span>
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
        )}

        {(showStatus && hasInstallments) || accountName ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200/80 pt-2">
            {showStatus && hasInstallments && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Status da transação</span>
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

  const installmentAmount =
    hasInstallments && installmentContext?.currentTransactionAmount
      ? installmentContext.currentTransactionAmount
      : reaisToMoneyString(amount)
  const purchaseTotal = installmentContext?.purchaseTotal
  const purchaseTotalIsEstimate = installmentContext?.purchaseTotalIsEstimate ?? false
  const showPurchaseTotal =
    hasInstallments && purchaseTotal != null && purchaseTotal !== installmentAmount

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
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
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <TransactionStatusBadge status={status} />
          </div>
        )}
      </div>
      {accountName && (
        <p className="mt-3 border-t border-slate-200/80 pt-2 text-xs text-slate-500">
          Conta · <span className="font-medium text-slate-700">{accountName}</span>
        </p>
      )}
    </div>
  )
}
