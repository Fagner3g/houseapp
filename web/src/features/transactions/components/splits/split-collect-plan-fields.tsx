import { useId } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/currency'

import { SplitParcelChargeToggle } from './split-parcel-charge-toggle'

interface SplitCollectPlanFieldsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  installmentsTotal: number
  onInstallmentsTotalChange: (n: number) => void
  startDate: string
  onStartDateChange: (value: string) => void
  totalShareReais: number
}

/** Partner collect-plan controls for one-shot (à vista) purchases. */
export function SplitCollectPlanFields({
  enabled,
  onEnabledChange,
  installmentsTotal,
  onInstallmentsTotalChange,
  startDate,
  onStartDateChange,
  totalShareReais,
}: SplitCollectPlanFieldsProps) {
  const countId = useId()
  const dateId = useId()
  const perParcel =
    enabled && installmentsTotal >= 2 ? totalShareReais / installmentsTotal : totalShareReais

  return (
    <div className="space-y-3">
      <SplitParcelChargeToggle
        checked={enabled}
        onCheckedChange={onEnabledChange}
        banner={
          enabled
            ? `A cobrança será parcelada em ${installmentsTotal}× de ${formatCurrency(perParcel)} (independente da compra à vista).`
            : 'A cobrança será à vista (valor total da divisão de uma vez).'
        }
      />
      {enabled && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={countId} className="text-sm text-slate-600">
              Parcelas
            </Label>
            <Input
              id={countId}
              type="number"
              min={2}
              max={48}
              value={installmentsTotal}
              onChange={e => onInstallmentsTotalChange(Math.max(2, Number(e.target.value) || 2))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={dateId} className="text-sm text-slate-600">
              1º vencimento
            </Label>
            <Input
              id={dateId}
              type="date"
              value={startDate}
              onChange={e => onStartDateChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function defaultCollectStartDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
