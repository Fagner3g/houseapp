import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { cn } from '@/lib/utils'

import { collapsedHeader } from './collapsed-header'
import { PlainSummaryBody } from './plain-body'
import { SummaryChip } from './shared'
import { SplitSummaryBody } from './split-body'

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
  isEdit = false,
}: TransactionFooterSummaryProps) {
  const installmentContext = installmentSummary ?? splitDebtSummary
  const [open, setOpen] = useState(!isEdit)
  const header = collapsedHeader(
    splitDebtSummary,
    installmentContext,
    amount,
    installmentNumber,
    installmentsTotal
  )

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <button
        type="button"
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors duration-200',
          'hover:bg-slate-50/80',
          open && 'border-b border-slate-100'
        )}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {header.label}
          </p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="truncate text-base font-semibold tracking-tight tabular-nums text-slate-900">
              {header.primary}
            </p>
            {header.chips.map(chip => (
              <SummaryChip key={chip.text} tone={chip.tone}>
                {chip.text}
              </SummaryChip>
            ))}
          </div>
        </div>
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors',
            open && 'bg-slate-200/80 text-slate-700'
          )}
        >
          <ChevronDown
            className={cn(
              'size-4 transition-transform duration-300 ease-out',
              open && 'rotate-180'
            )}
          />
        </span>
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              'bg-slate-50/90 px-3.5 py-3 transition-opacity duration-200 ease-out',
              open ? 'opacity-100' : 'opacity-0'
            )}
          >
            {splitDebtSummary ? (
              <SplitSummaryBody
                splitDebtSummary={splitDebtSummary}
                amount={amount}
                status={status}
                showStatus={showStatus}
                accountName={accountName}
                installmentNumber={installmentNumber}
                installmentsTotal={installmentsTotal}
              />
            ) : (
              <PlainSummaryBody
                installmentSummary={installmentSummary}
                amount={amount}
                status={status}
                showStatus={showStatus}
                accountName={accountName}
                installmentNumber={installmentNumber}
                installmentsTotal={installmentsTotal}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
