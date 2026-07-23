import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import type { GetSplitDebtSummary200 } from '@/api/generated/model'
import { cn } from '@/lib/utils'

import { collapsedHeader } from './collapsed-header'
import { hasExpandableSummaryDetails } from './has-expandable-details'
import { PlainSummaryBody } from './plain-body'
import {
  SummaryHeaderContent,
  TRANSACTION_STATUS_LABELS,
  type TransactionStatus,
} from './shared'
import { SplitSummaryBody } from './split-body'

interface TransactionFooterSummaryProps {
  splitDebtSummary?: GetSplitDebtSummary200
  installmentSummary?: GetSplitDebtSummary200
  amount: number
  status: TransactionStatus
  showStatus: boolean
  installmentNumber?: number | null
  installmentsTotal?: number | null
  isEdit?: boolean
}

const STATUS_CHIP_TONE: Record<TransactionStatus, 'neutral' | 'warning' | 'success'> = {
  paid: 'success',
  partial: 'warning',
  pending: 'warning',
}

export function TransactionFooterSummary({
  splitDebtSummary,
  installmentSummary,
  amount,
  status,
  showStatus,
  installmentNumber,
  installmentsTotal,
  isEdit = false,
}: TransactionFooterSummaryProps) {
  const installmentContext = installmentSummary ?? splitDebtSummary
  const canExpand = hasExpandableSummaryDetails(
    splitDebtSummary,
    installmentSummary,
    installmentsTotal
  )
  const [open, setOpen] = useState(!isEdit && canExpand)
  const header = collapsedHeader(
    splitDebtSummary,
    installmentContext,
    amount,
    installmentNumber,
    installmentsTotal
  )
  const chips = [
    ...header.chips,
    ...(showStatus
      ? [{ text: TRANSACTION_STATUS_LABELS[status], tone: STATUS_CHIP_TONE[status] }]
      : []),
  ]

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      {canExpand ? (
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
          <SummaryHeaderContent label={header.label} primary={header.primary} chips={chips} />
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
      ) : (
        <div className="flex items-center gap-3 px-3.5 py-3">
          <SummaryHeaderContent label={header.label} primary={header.primary} chips={chips} />
        </div>
      )}

      {canExpand ? (
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
                  installmentNumber={installmentNumber}
                  installmentsTotal={installmentsTotal}
                />
              ) : (
                <PlainSummaryBody
                  installmentSummary={installmentSummary}
                  amount={amount}
                  installmentNumber={installmentNumber}
                  installmentsTotal={installmentsTotal}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
