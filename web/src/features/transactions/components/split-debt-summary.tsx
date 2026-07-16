import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import type { GetSplitDebtSummary200PersonsItem } from '@/api/generated/model'
import { formatCurrency, formatMoneyString, moneyStringToReais } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { computeSplitDebtProgress } from '../split-debt-summary.utils'
import { PersonInstallmentPlanList } from './person-installment-plan-list'

interface SplitDebtSummaryProps {
  summary: {
    purchaseTotal: string
    installmentsTotal: number | null
    myShareTotal: string
  }
}

export function SplitDebtSummary({ summary }: SplitDebtSummaryProps) {
  const hasInstallments = (summary.installmentsTotal ?? 0) > 1
  const showMyShare = moneyStringToReais(summary.myShareTotal) >= 0.005

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Resumo da divisão
          </p>
          {hasInstallments && (
            <p className="mt-1 text-sm text-slate-600">
              Compra de {formatMoneyString(summary.purchaseTotal)} em{' '}
              {summary.installmentsTotal} parcelas
            </p>
          )}
        </div>
        {showMyShare ? (
          <div className="text-right">
            <p className="text-xs text-slate-500">Meu valor total</p>
            <p className="text-base font-semibold tabular-nums text-slate-900">
              {formatMoneyString(summary.myShareTotal)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface PersonSplitDebtDetailsProps {
  person: GetSplitDebtSummary200PersonsItem
  currentTransactionId: string
  installmentsTotal: number | null
}

export function PersonSplitDebtDetails({
  person,
  currentTransactionId,
  installmentsTotal,
}: PersonSplitDebtDetailsProps) {
  const [planOpen, setPlanOpen] = useState(false)
  const progress = computeSplitDebtProgress(person.totalOwed, person.totalPaid)
  const showInstallmentPlan = (installmentsTotal ?? 0) > 1 && person.installments.length > 1
  const planCount = person.installments.length

  return (
    <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
      <p className="text-sm text-slate-600">
        Total devido:{' '}
        <strong className="tabular-nums text-slate-900">
          {formatMoneyString(person.totalOwed)}
        </strong>
      </p>

      <div className="space-y-2">
        <div className="flex h-2 overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progress.paidPercent}%` }}
          />
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600">
          <span>
            Pago:{' '}
            <strong className="tabular-nums text-emerald-700">
              {formatCurrency(progress.paidReais)}
            </strong>
          </span>
          <span>
            Falta:{' '}
            <strong className="tabular-nums text-amber-700">
              {formatCurrency(progress.remainingReais)}
            </strong>
          </span>
        </div>
      </div>

      {showInstallmentPlan && (
        <div>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md py-1 text-left text-xs font-medium text-slate-600 hover:text-slate-900"
            onClick={() => setPlanOpen(v => !v)}
            aria-expanded={planOpen}
          >
            <span>{planOpen ? 'Ocultar parcelas' : `Ver parcelas (${planCount})`}</span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 transition-transform duration-200',
                planOpen && 'rotate-180'
              )}
            />
          </button>

          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-200 ease-out',
              planOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <PersonInstallmentPlanList
                installments={person.installments}
                installmentsTotal={installmentsTotal}
                currentTransactionId={currentTransactionId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
