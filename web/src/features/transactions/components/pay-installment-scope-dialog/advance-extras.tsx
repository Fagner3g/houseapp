import dayjs from 'dayjs'
import { Layers } from 'lucide-react'

import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCentsString } from '@/lib/currency'
import { cn } from '@/lib/utils'

import type { SettlementKind } from '../../lib/settlement-copy'
import { payInstallmentScopeAllLabel } from '../../lib/settlement-advance-copy'
import { OptionalSection } from './optional-section'

type AdvanceExtrasProps = {
  kind: SettlementKind
  futureInstallments: GetInstallmentSeries200InstallmentsItem[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
  className?: string
}

export function AdvanceExtras({
  kind,
  futureInstallments,
  selectedIds,
  onSelectedIdsChange,
  open,
  onOpenChange,
  disabled = false,
  className,
}: AdvanceExtrasProps) {
  if (futureInstallments.length === 0) return null

  const allSelected =
    futureInstallments.length > 0 &&
    futureInstallments.every(item => selectedIds.includes(item.id))

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      onSelectedIdsChange([...selectedIds, id])
      return
    }
    onSelectedIdsChange(selectedIds.filter(itemId => itemId !== id))
  }

  const summary =
    selectedIds.length > 0 ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
        {selectedIds.length} incluída{selectedIds.length === 1 ? '' : 's'}
      </span>
    ) : (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
        Opcional
      </span>
    )

  return (
    <OptionalSection
      icon={Layers}
      title="Adiantar também"
      hint="Acompanha o valor pago ou marque para somar"
      summary={summary}
      open={open}
      onOpenChange={onOpenChange}
      className={cn(disabled && 'pointer-events-none opacity-60', className)}
    >
      <div className="flex justify-end">
        <button
          type="button"
          className="text-xs font-medium text-violet-700 hover:underline disabled:text-slate-400 disabled:no-underline"
          disabled={disabled}
          onClick={() =>
            onSelectedIdsChange(
              allSelected ? [] : futureInstallments.map(item => item.id)
            )
          }
        >
          {allSelected ? 'Limpar' : payInstallmentScopeAllLabel(kind)}
        </button>
      </div>

      <div className="space-y-1.5">
        {futureInstallments.map(item => {
          const checked = selectedIds.includes(item.id)
          return (
            // Radix Checkbox is not a native input; label still wraps the control.
            // biome-ignore lint/a11y/noLabelWithoutControl: wraps Radix Checkbox
            <label
              key={item.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
                checked
                  ? 'bg-emerald-50 text-slate-900'
                  : 'hover:bg-slate-50'
              )}
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={value => toggle(item.id, value === true)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Parcela {item.installmentNumber}
                  {checked ? (
                    <span className="ml-1.5 text-xs font-normal text-emerald-700">
                      no valor
                    </span>
                  ) : null}
                </p>
                <p className="text-xs tabular-nums text-slate-500">
                  {dayjs(item.date).format('DD/MM/YYYY')} ·{' '}
                  {formatCentsString(item.remaining)}
                </p>
              </div>
            </label>
          )
        })}
      </div>
    </OptionalSection>
  )
}
