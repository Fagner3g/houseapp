import { useId, useEffect, useState } from 'react'

import type { SplitMode } from '@/features/accounts/components/import-review-types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { stackyPrimaryButton } from '@/lib/ui-classes'

import { SplitAddAmountFields } from './split-add-amount-fields'
import { SplitAddChargeOptions } from './split-add-charge-options'
import { defaultCollectStartDate } from './split-collect-plan-fields'
import { SplitModePresets } from './split-mode-presets'
import { SplitPersonFields } from './split-person-fields'

type PersonMode = 'member' | 'contact'
type AmountMode = 'fixed' | 'percent'

export interface SplitAddFormValues {
  personMode: PersonMode
  selectedUserId: string
  contactName: string
  contactPhone: string
  notifyEnabled: boolean
  parcelCharge: boolean
  collectPlan: boolean
  collectInstallmentsTotal: number
  collectStartDate: string
  amountMode: AmountMode
  splitAmount: number
  splitPercent: number
  presetMode: SplitMode
}

interface SplitAddFormProps {
  remainingReais: number
  purchaseTotalReais: number
  isParceledPurchase: boolean
  parcelCount: number
  currentParcelLabel: string | null
  isSubmitting?: boolean
  onSubmit: (values: SplitAddFormValues) => void
  onCancel: () => void
}

export function SplitAddForm({
  remainingReais,
  purchaseTotalReais,
  isParceledPurchase,
  parcelCount,
  currentParcelLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: SplitAddFormProps) {
  const splitNotifyId = useId()
  const [presetMode, setPresetMode] = useState<SplitMode>('half')
  const [personMode, setPersonMode] = useState<PersonMode>('member')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [parcelCharge, setParcelCharge] = useState(true)
  const [collectPlan, setCollectPlan] = useState(false)
  const [collectInstallmentsTotal, setCollectInstallmentsTotal] = useState(3)
  const [collectStartDate, setCollectStartDate] = useState(defaultCollectStartDate)
  const [amountMode, setAmountMode] = useState<AmountMode>('fixed')
  const [splitAmount, setSplitAmount] = useState(0)
  const [splitPercent, setSplitPercent] = useState(50)

  useEffect(() => {
    if (presetMode === 'half') {
      setAmountMode('percent')
      setSplitPercent(50)
    } else if (presetMode === 'full_other') {
      setAmountMode('fixed')
      setSplitAmount(remainingReais)
    } else {
      setAmountMode('fixed')
      setSplitAmount(0)
      setSplitPercent(0)
    }
  }, [presetMode, remainingReais])

  const previewSplitReais =
    amountMode === 'percent' ? (purchaseTotalReais * splitPercent) / 100 : splitAmount
  const showParcelChargeToggle = isParceledPurchase && amountMode === 'percent'
  const showCollectPlanToggle = !isParceledPurchase && amountMode === 'percent'
  const chargePerInstallment = showParcelChargeToggle && parcelCharge
  const previewInstallmentSplitReais = chargePerInstallment
    ? previewSplitReais / parcelCount
    : previewSplitReais
  const showAmountFields = presetMode === 'custom' || presetMode === 'half'
  const showPercentOnly = presetMode === 'half'

  return (
    <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Tipo de divisão</Label>
        <SplitModePresets variant="add" value={presetMode} onChange={setPresetMode} />
      </div>

      <SplitAddChargeOptions
        isParceledPurchase={isParceledPurchase}
        parcelCount={parcelCount}
        currentParcelLabel={currentParcelLabel}
        amountMode={amountMode}
        chargePerInstallment={chargePerInstallment}
        purchaseTotalReais={purchaseTotalReais}
        previewSplitReais={previewSplitReais}
        showParcelChargeToggle={showParcelChargeToggle}
        parcelCharge={parcelCharge}
        onParcelChargeChange={setParcelCharge}
        showCollectPlanToggle={showCollectPlanToggle}
        collectPlan={collectPlan}
        onCollectPlanChange={setCollectPlan}
        collectInstallmentsTotal={collectInstallmentsTotal}
        onCollectInstallmentsTotalChange={setCollectInstallmentsTotal}
        collectStartDate={collectStartDate}
        onCollectStartDateChange={setCollectStartDate}
      />

      {presetMode === 'full_other' && (
        <p className="text-sm text-slate-600">
          Valor a delegar:{' '}
          <strong className="tabular-nums text-slate-900">{formatCurrency(remainingReais)}</strong>
        </p>
      )}

      <SplitPersonFields
        personMode={personMode}
        onPersonModeChange={setPersonMode}
        selectedUserId={selectedUserId}
        onSelectedUserIdChange={setSelectedUserId}
        contactName={contactName}
        onContactNameChange={setContactName}
        contactPhone={contactPhone}
        onContactPhoneChange={setContactPhone}
      />

      {showAmountFields && (
        <SplitAddAmountFields
          amountMode={amountMode}
          onAmountModeChange={setAmountMode}
          splitAmount={splitAmount}
          onSplitAmountChange={setSplitAmount}
          splitPercent={splitPercent}
          onSplitPercentChange={setSplitPercent}
          previewSplitReais={previewSplitReais}
          previewInstallmentSplitReais={previewInstallmentSplitReais}
          chargePerInstallment={chargePerInstallment}
          showParcelChargeToggle={showParcelChargeToggle}
          parcelCharge={parcelCharge}
          showPercentOnly={showPercentOnly}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={splitNotifyId} className="text-sm text-slate-600">
          Notificar esta pessoa
        </Label>
        <Switch id={splitNotifyId} checked={notifyEnabled} onCheckedChange={setNotifyEnabled} />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          className={cn('flex-1', stackyPrimaryButton)}
          disabled={isSubmitting}
          onClick={() =>
            onSubmit({
              personMode,
              selectedUserId: selectedUserId ?? '',
              contactName,
              contactPhone,
              notifyEnabled,
              parcelCharge: showParcelChargeToggle ? parcelCharge : true,
              collectPlan: showCollectPlanToggle ? collectPlan : false,
              collectInstallmentsTotal,
              collectStartDate,
              amountMode: showPercentOnly ? 'percent' : amountMode,
              splitAmount: presetMode === 'full_other' ? remainingReais : splitAmount,
              splitPercent: showPercentOnly ? 50 : splitPercent,
              presetMode,
            })
          }
        >
          Adicionar
        </Button>
      </div>
    </div>
  )
}
