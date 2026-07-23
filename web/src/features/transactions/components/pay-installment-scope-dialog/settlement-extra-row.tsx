import dayjs from 'dayjs'

import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCentsString } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { isSettlementExtraOverdue } from '../../lib/settlement-extra-installments'

type SettlementExtraRowProps = {
  item: GetInstallmentSeries200InstallmentsItem
  currentInstallmentNumber: number
  checked: boolean
  disabled?: boolean
  dense?: boolean
  onCheckedChange: (checked: boolean) => void
}

export function SettlementExtraRow({
  item,
  currentInstallmentNumber,
  checked,
  disabled = false,
  dense = false,
  onCheckedChange,
}: SettlementExtraRowProps) {
  const overdue = isSettlementExtraOverdue(item, currentInstallmentNumber)

  return (
    // Radix Checkbox is not a native input; label still wraps the control.
    // biome-ignore lint/a11y/noLabelWithoutControl: wraps Radix Checkbox
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 transition-colors',
        dense
          ? 'rounded-xl px-2.5 py-2'
          : 'items-start rounded-md border px-3 py-2 hover:bg-slate-50',
        !dense && (overdue ? 'border-red-200 bg-red-50/40' : 'border-slate-200'),
        dense && checked && !overdue && 'bg-emerald-50 text-slate-900',
        dense && checked && overdue && 'bg-red-50 text-slate-900',
        dense && !checked && overdue && 'bg-red-50/50 hover:bg-red-50',
        dense && !checked && !overdue && 'hover:bg-slate-50'
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={value => onCheckedChange(value === true)}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'flex flex-wrap items-center gap-1.5 text-sm font-medium',
            !dense && 'text-slate-900'
          )}
        >
          Parcela {item.installmentNumber}
          {overdue ? (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
              Vencida
            </span>
          ) : null}
          {dense && checked ? (
            <span
              className={cn(
                'text-xs font-normal',
                overdue ? 'text-red-700' : 'text-emerald-700'
              )}
            >
              no valor
            </span>
          ) : null}
        </p>
        <p
          className={cn(
            'text-xs text-slate-500',
            dense && 'tabular-nums'
          )}
        >
          {dayjs(item.date).format('DD/MM/YYYY')} ·{' '}
          {dense ? formatCentsString(item.remaining) : `Saldo ${formatCentsString(item.remaining)}`}
        </p>
      </div>
    </label>
  )
}
