import dayjs from 'dayjs'

import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCentsString } from '@/lib/currency'
import { cn } from '@/lib/utils'

type AdvanceInstallmentsPickerProps = {
  installments: GetInstallmentSeries200InstallmentsItem[]
  currentInstallmentNumber: number
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  paidAmountReais: number
  currentRemainingReais: number
  className?: string
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
  className,
}: AdvanceInstallmentsPickerProps) {
  const futureInstallments = installments.filter(
    item =>
      item.installmentNumber > currentInstallmentNumber &&
      item.status !== 'paid' &&
      item.status !== 'canceled' &&
      Number.parseFloat(item.remaining) > 0
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
        <p className="text-sm font-medium text-slate-900">Selecione as parcelas a adiantar</p>
        <p className="text-xs text-slate-500">
          O valor pago deve fechar com o saldo desta parcela mais as parcelas selecionadas.
        </p>
      </div>

      <div className="space-y-2">
        {futureInstallments.map(item => {
          const checked = selectedIds.includes(item.id)

          return (
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
            Ajuste a seleção para igualar o valor pago de {formatCentsString(paidAmountReais.toFixed(2))}.
          </p>
        )}
      </div>
    </div>
  )
}
