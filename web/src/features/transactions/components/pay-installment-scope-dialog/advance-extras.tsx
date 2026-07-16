import { Layers } from 'lucide-react'

import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'
import { cn } from '@/lib/utils'

import type { SettlementKind } from '../../lib/settlement-copy'
import {
  payInstallmentScopeAllLabel,
  payInstallmentScopeExtrasHint,
  payInstallmentScopeExtrasTitle,
} from '../../lib/settlement-advance-copy'
import { isSettlementExtraOverdue } from '../../lib/settlement-extra-installments'
import { OptionalSection } from './optional-section'
import { SettlementExtraRow } from './settlement-extra-row'

type AdvanceExtrasProps = {
  kind: SettlementKind
  currentInstallmentNumber: number
  extraInstallments: GetInstallmentSeries200InstallmentsItem[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
  className?: string
}

export function AdvanceExtras({
  kind,
  currentInstallmentNumber,
  extraInstallments,
  selectedIds,
  onSelectedIdsChange,
  open,
  onOpenChange,
  disabled = false,
  className,
}: AdvanceExtrasProps) {
  if (extraInstallments.length === 0) return null

  const hasOverdue = extraInstallments.some(item =>
    isSettlementExtraOverdue(item, currentInstallmentNumber)
  )
  const allSelected = extraInstallments.every(item => selectedIds.includes(item.id))

  const summary =
    selectedIds.length > 0 ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
        {selectedIds.length} incluída{selectedIds.length === 1 ? '' : 's'}
      </span>
    ) : hasOverdue ? (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
        Há vencidas
      </span>
    ) : (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
        Opcional
      </span>
    )

  return (
    <OptionalSection
      icon={Layers}
      title={payInstallmentScopeExtrasTitle(hasOverdue)}
      hint={payInstallmentScopeExtrasHint(hasOverdue)}
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
              allSelected ? [] : extraInstallments.map(item => item.id)
            )
          }
        >
          {allSelected ? 'Limpar' : payInstallmentScopeAllLabel(kind)}
        </button>
      </div>

      <div className="space-y-1.5">
        {extraInstallments.map(item => (
          <SettlementExtraRow
            key={item.id}
            item={item}
            currentInstallmentNumber={currentInstallmentNumber}
            checked={selectedIds.includes(item.id)}
            disabled={disabled}
            dense
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
    </OptionalSection>
  )
}
