import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'
import { formatCentsString } from '@/lib/currency'
import { cn } from '@/lib/utils'

import type { SettlementKind } from '../lib/settlement-copy'
import {
  advancePickerAmountMismatch,
  advancePickerHint,
  advancePickerTitle,
} from '../lib/settlement-advance-copy'
import { listSettlementExtraInstallments } from '../lib/settlement-extra-installments'
import { SettlementExtraRow } from './pay-installment-scope-dialog/settlement-extra-row'

export {
  listFutureUnpaidInstallments,
  listPriorOverdueUnpaidInstallments,
  listSettlementExtraInstallments,
  isSettlementExtraOverdue,
} from '../lib/settlement-extra-installments'

type AdvanceInstallmentsPickerProps = {
  installments: GetInstallmentSeries200InstallmentsItem[]
  currentInstallmentNumber: number
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  paidAmountReais: number
  currentRemainingReais: number
  kind?: SettlementKind
  className?: string
}

/** True when this occurrence can still advance later parcels in the series. */
export function canOfferInstallmentAdvance(
  installmentNumber: number | null | undefined,
  installmentsTotal: number | null | undefined
): boolean {
  return (
    installmentNumber != null &&
    (installmentsTotal ?? 0) > 1 &&
    installmentNumber < installmentsTotal
  )
}

export function computeAdvancePaymentTotalReais(
  currentRemainingReais: number,
  installments: GetInstallmentSeries200InstallmentsItem[],
  selectedIds: string[]
): number {
  const selectedRemaining = installments
    .filter(item => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + Number.parseFloat(item.remaining), 0)

  return currentRemainingReais + selectedRemaining
}

export function AdvanceInstallmentsPicker({
  installments,
  currentInstallmentNumber,
  selectedIds,
  onSelectedIdsChange,
  paidAmountReais,
  currentRemainingReais,
  kind = 'expense',
  className,
}: AdvanceInstallmentsPickerProps) {
  const extras = listSettlementExtraInstallments(
    installments,
    currentInstallmentNumber
  )
  const selectedTotal = computeAdvancePaymentTotalReais(
    currentRemainingReais,
    installments,
    selectedIds
  )
  const matchesPaidAmount = Math.abs(selectedTotal - paidAmountReais) < 0.005

  if (extras.length === 0) {
    return (
      <p className={cn('text-sm text-amber-700', className)}>
        Não há parcelas disponíveis para incluir neste recebimento.
      </p>
    )
  }

  return (
    <div className={cn('space-y-3 rounded-lg border border-slate-200 bg-white p-4', className)}>
      <div>
        <p className="text-sm font-medium text-slate-900">{advancePickerTitle(kind)}</p>
        <p className="text-xs text-slate-500">{advancePickerHint(kind)}</p>
      </div>

      <div className="space-y-2">
        {extras.map(item => (
          <SettlementExtraRow
            key={item.id}
            item={item}
            currentInstallmentNumber={currentInstallmentNumber}
            checked={selectedIds.includes(item.id)}
            onCheckedChange={checked =>
              onSelectedIdsChange(
                checked
                  ? [...selectedIds, item.id]
                  : selectedIds.filter(id => id !== item.id)
              )
            }
          />
        ))}
      </div>

      <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <p>
          Total selecionado:{' '}
          <span className="font-medium text-slate-900">
            {formatCentsString(selectedTotal.toFixed(2))}
          </span>
        </p>
        {!matchesPaidAmount && (
          <p className="mt-1 text-xs text-amber-700">
            {advancePickerAmountMismatch(
              kind,
              formatCentsString(paidAmountReais.toFixed(2))
            )}
          </p>
        )}
      </div>
    </div>
  )
}
