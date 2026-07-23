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
import {
  markSplitReceivedLabel,
} from '../../lib/split-reimbursement-copy'
import { SplitPaymentsList } from '../split-payments-list'
import { SPLIT_STATUS_LABELS, SPLIT_STATUS_VARIANT } from './split-status'
import { personInitials } from './person-initials'
import { splitChargeModeBadge } from './split-charge-mode'
import { SplitPaymentProgress } from './split-payment-progress'

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
  viewerIsCreditor: boolean
  viewerCanMutate: boolean
  onRequestPaymentConfirmation: (splitId: string) => void
  onMarkReceived: (splitId: string) => void
  onDelete: (splitId: string) => void
  isDeleting?: boolean
  isRequestingPayment?: boolean
  isMarkingReceived?: boolean
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
  viewerIsCreditor,
  viewerCanMutate,
  onRequestPaymentConfirmation,
  onMarkReceived,
  onDelete,
  isDeleting,
  isRequestingPayment,
  isMarkingReceived,
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
  const isCollectPlan = (split.collectInstallmentsTotal ?? 0) >= 2
  const showPersonDebtDetails =
    personDebt != null && (parcelInstallmentsTotal > 1 || isCollectPlan)
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
          collectLumpSum: split.collectLumpSum,
        })
      : split.amount

  const amountMode = splitChargeModeBadge({
    collectLumpSum: split.collectLumpSum,
    collectInstallmentsTotal: split.collectInstallmentsTotal,
    collectInstallmentNumber: split.collectInstallmentNumber,
    purchaseInstallmentsTotal: showPersonDebtDetails ? parcelInstallmentsTotal : null,
    purchaseInstallmentNumber: parcelNumber,
  })

  const amountLabel =
    amountMode?.caption ??
    (showPersonDebtDetails
      ? `Valor desta parcela${
          parcelInstallmentsTotal > 1 ? ` (${parcelNumber}/${parcelInstallmentsTotal})` : ''
        }`
      : null)

  const isUnsettled = split.status !== 'paid' && split.status !== 'forgiven'
  const hasPendingRequest = Boolean(split.pendingPaymentRequest)
  const showPayments =
    split.status === 'paid' ||
    split.status === 'partial' ||
    moneyStringToReais(split.paidAmount) > 0

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
              {amountLabel && (
                <p className="mb-1 text-xs text-slate-500">{amountLabel}</p>
              )}
              <span className="inline-flex items-center gap-1.5">
                {formatMoneyString(displayInstallmentAmount)}
                {amountMode && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {amountMode.badge}
                  </Badge>
                )}
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
            {hasPendingRequest && (
              <p className="mt-1 text-xs text-amber-700">Aguardando confirmação</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={SPLIT_STATUS_VARIANT[split.status]}>
            {SPLIT_STATUS_LABELS[split.status]}
          </Badge>
          <div className="flex items-center gap-1">
            {isUnsettled && viewerIsCreditor && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isMarkingReceived}
                onClick={() => onMarkReceived(split.id)}
              >
                {markSplitReceivedLabel()}
              </Button>
            )}
            {isUnsettled && !viewerIsCreditor && !hasPendingRequest && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRequestingPayment}
                onClick={() => onRequestPaymentConfirmation(split.id)}
              >
                Avisar que paguei
              </Button>
            )}
            {isUnsettled && !viewerIsCreditor && hasPendingRequest && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Aguardando confirmação
              </Badge>
            )}
            {viewerCanMutate &&
              split.status === 'pending' &&
              moneyStringToReais(split.paidAmount) === 0 && (
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

      {!showPersonDebtDetails && (
        <SplitPaymentProgress
          className="mt-2"
          totalOwed={split.amount}
          totalPaid={split.paidAmount}
        />
      )}

      {showPersonDebtDetails && personDebt && debtSummary && (
        <PersonSplitDebtDetails
          person={personDebt}
          currentTransactionId={transactionId}
          installmentsTotal={debtSummary.installmentsTotal}
        />
      )}

      {showPayments && (
        <SplitPaymentsList
          slug={slug}
          transactionId={transactionId}
          splitId={split.id}
          canCancel={viewerIsCreditor}
        />
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
