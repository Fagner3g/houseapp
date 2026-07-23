import { useId } from 'react'

import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

import {
  settledAmountLabel,
  type SettlementKind,
} from '../../lib/settlement-copy'
import { underpaymentCarryHint } from '../../lib/settlement-advance-copy'

type CurrentPaymentHeroProps = {
  kind: SettlementKind
  installmentNumber: number
  installmentsTotal: number
  installmentAmountReais: number
  remainingReais: number
  paidAmountReais: number
  onPaidAmountChange: (value: number) => void
  nextInstallmentNumber: number | null
  nextInstallmentAmountReais: number | null
  amountLocked?: boolean
  className?: string
}

export function CurrentPaymentHero({
  kind,
  installmentNumber,
  installmentsTotal,
  installmentAmountReais,
  remainingReais,
  paidAmountReais,
  onPaidAmountChange,
  nextInstallmentNumber,
  nextInstallmentAmountReais,
  amountLocked = false,
  className,
}: CurrentPaymentHeroProps) {
  const amountInputId = useId()
  const isPartial = paidAmountReais > 0 && paidAmountReais < remainingReais
  const isOver = paidAmountReais > remainingReais + 0.005
  const carryHint =
    !amountLocked &&
    nextInstallmentNumber != null &&
    nextInstallmentAmountReais != null
      ? underpaymentCarryHint(
          kind,
          paidAmountReais,
          remainingReais,
          nextInstallmentNumber,
          nextInstallmentAmountReais
        )
      : null

  const hint = isPartial
    ? 'Parcial — o restante soma na próxima parcela'
    : isOver
      ? 'Acima do saldo — excedente vai para as outras parcelas abaixo'
      : `Saldo desta parcela: ${formatCurrency(remainingReais)}`

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
            Parcela atual
          </p>
          <p className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">
            {installmentNumber}
            <span className="font-normal text-slate-400"> / {installmentsTotal}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Você está nesta parcela · as demais ficam abaixo
          </p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium tabular-nums text-slate-600">
          {formatCurrency(installmentAmountReais)}
          {remainingReais < installmentAmountReais - 0.005
            ? ` · saldo ${formatCurrency(remainingReais)}`
            : null}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={amountInputId}
          className="text-sm font-medium text-slate-700"
        >
          {settledAmountLabel(kind)}
        </label>
        <CurrencyInput
          id={amountInputId}
          value={paidAmountReais}
          onValueChange={value => onPaidAmountChange(value ?? 0)}
          disabled={amountLocked}
          className="h-12 rounded-xl border-slate-200 bg-slate-50/80 px-4 text-lg font-semibold tabular-nums tracking-tight text-slate-900 shadow-none focus-visible:bg-white"
        />
        <p className="text-xs leading-relaxed text-slate-500">{hint}</p>
        {carryHint ? (
          <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs leading-relaxed text-amber-800">
            {carryHint}
          </p>
        ) : null}
      </div>
    </div>
  )
}
