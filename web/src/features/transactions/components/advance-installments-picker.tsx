import dayjs from 'dayjs'

import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCentsString } from '@/lib/currency'
import { cn } from '@/lib/utils'

import type {
  SettlementKind,
} from '../lib/settlement-copy'
import {
  advancePickerAmountMismatch,
  advancePickerHint,
  advancePickerTitle,
} from '../lib/settlement-advance-copy'

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

export function listFutureUnpaidInstallments(
  installments: GetInstallmentSeries200InstallmentsItem[],
  currentInstallmentNumber: number
): GetInstallmentSeries200InstallmentsItem[] {
  return installments.filter(
    item =>
      item.installmentNumber > currentInstallmentNumber &&
      item.status !== 'paid' &&
      item.status !== 'canceled' &&
      Number.parseFloat(item.remaining) > 0
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
  const futureInstallments = listFutureUnpaidInstallments(
    installments,
    currentInstallmentNumber
  )

  const selectedTotal = computeAdvancePaymentTotalReais(
    currentRemainingReais,
    installments,
    selectedIds
  )
  const matchesPaidAmount = Math.abs(selectedTotal - paidAmountReais) < 0.005

  const toggleInstallment = (id: string, checked: boolean) => {
    if (checked) {
      onSelectedIdsChange([...selectedIds, id])
      return
    }

    onSelectedIdsChange(selectedIds.filter(itemId => itemId !== id))
  }

  if (futureInstallments.length === 0) {
    return (
      <p className={cn('text-sm text-amber-700', className)}>
        Não há parcelas futuras disponíveis para adiantamento.
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
        {futureInstallments.map(item => {
          const checked = selectedIds.includes(item.id)

          return (
            // Radix Checkbox is not a native input; label still wraps the control.
            // biome-ignore lint/a11y/noLabelWithoutControl: wraps Radix Checkbox
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={value => toggleInstallment(item.id, value === true)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  Parcela {item.installmentNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {dayjs(item.date).format('DD/MM/YYYY')} · Saldo{' '}
                  {formatCentsString(item.remaining)}
                </p>
              </div>
            </label>
          )
        })}
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
