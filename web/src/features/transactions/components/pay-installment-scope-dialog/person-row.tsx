import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

import type { UnsettledSplitItem } from '../../split-debt-summary.utils'
import {
  reimbursementPersonQuestion,
  reimbursementReceivedLabel,
} from '../../lib/split-reimbursement-copy'
import type {
  SplitPaymentMethod,
  SplitReimbursementChoice,
} from '../../lib/unified-settlement'
import { SPLIT_STATUS_LABELS, SPLIT_STATUS_VARIANT } from '../splits/split-status'

type PersonRowProps = {
  item: UnsettledSplitItem
  choice: SplitReimbursementChoice
  disabled?: boolean
  onChange: (patch: Partial<SplitReimbursementChoice>) => void
}

export function PersonRow({ item, choice, disabled, onChange }: PersonRowProps) {
  return (
    <div className="space-y-3 rounded-2xl bg-slate-50/90 px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold tracking-tight text-slate-900">{item.label}</p>
          <p className="mt-0.5 text-sm tabular-nums text-slate-500">
            Falta {formatCurrency(item.remainingReais)}
          </p>
        </div>
        <Badge
          variant={SPLIT_STATUS_VARIANT[item.split.status]}
          className="shrink-0 text-[10px] uppercase"
        >
          {SPLIT_STATUS_LABELS[item.split.status]}
        </Badge>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">
          {reimbursementPersonQuestion(item.label)}
        </p>
        <fieldset
          className="m-0 grid min-w-0 grid-cols-2 gap-1 rounded-xl border-0 bg-white p-1 ring-1 ring-slate-200/80"
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ reimbursed: true })}
            aria-pressed={choice.reimbursed === true}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              choice.reimbursed === true
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Sim
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ reimbursed: false })}
            aria-pressed={choice.reimbursed === false}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              choice.reimbursed === false
                ? 'bg-slate-200/90 text-slate-800 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            Ainda não
          </button>
        </fieldset>
      </div>

      {choice.reimbursed === true ? (
        <div className="grid gap-3 border-t border-slate-200/80 pt-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-600">
              {reimbursementReceivedLabel(item.label)}
            </p>
            <CurrencyInput
              value={choice.amountReais}
              onValueChange={value => onChange({ amountReais: value })}
              className="rounded-xl bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-600">Forma</p>
            <Select
              value={choice.method}
              onValueChange={value =>
                onChange({ method: value as SplitPaymentMethod })
              }
            >
              <SelectTrigger className="rounded-xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  )
}
