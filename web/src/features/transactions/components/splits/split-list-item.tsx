import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import type {
  GetSplitDebtSummary200,
  GetSplitDebtSummary200PersonsItem,
  ListSplits200SplitsItem,
} from '@/api/generated/model'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoneyString, moneyStringToReais, reaisToMoneyString } from '@/lib/currency'

import {
  formatPersonShareInstallmentAmount,
  inferPurchaseSplitPercent,
  resolveSplitInstallmentRemainingReais,
} from '../../split-debt-summary.utils'
import { PersonSplitDebtDetails } from '../split-debt-summary'
import { SplitPaymentsList } from '../split-payments-list'
import { SPLIT_STATUS_LABELS, SPLIT_STATUS_VARIANT } from './split-status'
import { personInitials } from './person-initials'

interface SplitListItemProps {
  split: ListSplits200SplitsItem
  personLabel: string
  slug: string
  transactionId: string
  debtSummary?: GetSplitDebtSummary200
  personDebt?: GetSplitDebtSummary200PersonsItem
  installmentNumber?: number | null
  installmentsTotal?: number | null
  parcelInstallmentsTotal: number
  onRegisterPayment: (splitId: string, remainingReais: number) => void
  onDelete: (splitId: string) => void
  isDeleting?: boolean
}

export function SplitListItem({
  split,
  personLabel,
  slug,
  transactionId,
  debtSummary,
  personDebt,
  installmentNumber,
  installmentsTotal,
  parcelInstallmentsTotal,
  onRegisterPayment,
  onDelete,
  isDeleting,
}: SplitListItemProps) {
  const remainingReais = resolveSplitInstallmentRemainingReais(split, {
    debtSummary,
    installmentNumber,
    installmentsTotal,
  })

  const purchaseSplitPercent =
    personDebt && debtSummary
      ? inferPurchaseSplitPercent(
          moneyStringToReais(personDebt.totalOwed),
          moneyStringToReais(debtSummary.purchaseTotal)
        )
      : null

  const currentInstallment = personDebt?.installments.find(item => item.splitId === split.id)
  const showPersonDebtDetails = personDebt != null && parcelInstallmentsTotal > 1
  const parcelNumber =
    currentInstallment?.installmentNumber ??
    installmentNumber ??
    debtSummary?.currentInstallmentNumber ??
    1

  const displayInstallmentAmount =
    showPersonDebtDetails && personDebt
      ? formatPersonShareInstallmentAmount({
          totalOwedReais: moneyStringToReais(personDebt.totalOwed),
          installmentsTotal: parcelInstallmentsTotal,
          installmentNumber: parcelNumber,
          currentSplitAmountReais: moneyStringToReais(split.amount),
          materializedInstallmentSplits: personDebt.installments.length,
        })
      : split.amount

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-slate-200 text-xs font-semibold text-slate-600">
              {personInitials(personLabel)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-slate-900">
              {personLabel}
              {purchaseSplitPercent != null && (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {purchaseSplitPercent}% da compra
                </span>
              )}
            </p>
            <div className="mt-1 text-sm tabular-nums text-slate-700">
              {showPersonDebtDetails && (
                <p className="mb-1 text-xs text-slate-500">
                  Valor desta parcela
                  {parcelInstallmentsTotal > 1
                    ? ` (${parcelNumber}/${parcelInstallmentsTotal})`
                    : ''}
                </p>
              )}
              <span className="inline-flex items-center gap-1.5">
                {formatMoneyString(displayInstallmentAmount)}
                {split.status === 'partial' && (
                  <span className="text-slate-500">
                    · falta {formatMoneyString(reaisToMoneyString(remainingReais))}
                  </span>
                )}
              </span>
            </div>
            {split.notifyEnabled && (
              <p className="mt-1 text-xs text-slate-500">Lembretes ativos</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={SPLIT_STATUS_VARIANT[split.status]}>
            {SPLIT_STATUS_LABELS[split.status]}
          </Badge>
          <div className="flex items-center gap-1">
            {split.status !== 'paid' && split.status !== 'forgiven' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onRegisterPayment(split.id, remainingReais)}
              >
                Registrar pagamento
              </Button>
            )}
            {split.status === 'pending' && moneyStringToReais(split.paidAmount) === 0 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 text-slate-400 hover:text-rose-600"
                disabled={isDeleting}
                aria-label="Remover divisão"
                onClick={() => onDelete(split.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {showPersonDebtDetails && personDebt && debtSummary && (
        <PersonSplitDebtDetails
          person={personDebt}
          currentTransactionId={transactionId}
          installmentsTotal={debtSummary.installmentsTotal}
        />
      )}

      {moneyStringToReais(split.paidAmount) > 0 && (
        <SplitPaymentsList slug={slug} transactionId={transactionId} splitId={split.id} />
      )}
    </div>
  )
}

interface SplitListProps {
  children: ReactNode
}

export function SplitList({ children }: SplitListProps) {
  return <div className="space-y-2">{children}</div>
}
