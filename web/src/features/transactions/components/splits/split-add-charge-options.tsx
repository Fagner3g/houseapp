import { formatCurrency } from '@/lib/currency'

import {
  SplitCollectPlanFields,
} from './split-collect-plan-fields'
import { SplitParcelChargeToggle } from './split-parcel-charge-toggle'

interface SplitAddChargeOptionsProps {
  isParceledPurchase: boolean
  parcelCount: number
  currentParcelLabel: string | null
  amountMode: 'fixed' | 'percent'
  chargePerInstallment: boolean
  purchaseTotalReais: number
  previewSplitReais: number
  showParcelChargeToggle: boolean
  parcelCharge: boolean
  onParcelChargeChange: (value: boolean) => void
  showCollectPlanToggle: boolean
  collectPlan: boolean
  onCollectPlanChange: (value: boolean) => void
  collectInstallmentsTotal: number
  onCollectInstallmentsTotalChange: (value: number) => void
  collectStartDate: string
  onCollectStartDateChange: (value: string) => void
}

export function SplitAddChargeOptions({
  isParceledPurchase,
  parcelCount,
  currentParcelLabel,
  amountMode,
  chargePerInstallment,
  purchaseTotalReais,
  previewSplitReais,
  showParcelChargeToggle,
  parcelCharge,
  onParcelChargeChange,
  showCollectPlanToggle,
  collectPlan,
  onCollectPlanChange,
  collectInstallmentsTotal,
  onCollectInstallmentsTotalChange,
  collectStartDate,
  onCollectStartDateChange,
}: SplitAddChargeOptionsProps) {
  return (
    <>
      {isParceledPurchase && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Esta compra tem {parcelCount} parcelas
          {currentParcelLabel ? ` — você está na parcela ${currentParcelLabel}` : ''}.
          {amountMode === 'percent'
            ? chargePerInstallment
              ? ` A divisão em % será aplicada em todas as parcelas da compra (total estimado: ${formatCurrency(purchaseTotalReais)}).`
              : ` A cobrança será à vista nesta parcela (valor total da divisão: ${formatCurrency(previewSplitReais)}).`
            : ' A divisão em valor fixo vale apenas para esta parcela.'}
        </p>
      )}

      {showParcelChargeToggle && (
        <SplitParcelChargeToggle checked={parcelCharge} onCheckedChange={onParcelChargeChange} />
      )}

      {showCollectPlanToggle && (
        <SplitCollectPlanFields
          enabled={collectPlan}
          onEnabledChange={onCollectPlanChange}
          installmentsTotal={collectInstallmentsTotal}
          onInstallmentsTotalChange={onCollectInstallmentsTotalChange}
          startDate={collectStartDate}
          onStartDateChange={onCollectStartDateChange}
          totalShareReais={previewSplitReais}
        />
      )}
    </>
  )
}
