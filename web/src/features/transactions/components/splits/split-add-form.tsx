import { useId, useEffect, useState } from 'react'

import type { SplitMode } from '@/features/accounts/components/import-review-types'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatCurrency, formatMoneyString, reaisToMoneyString } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { stackyPrimaryButton } from '@/lib/ui-classes'

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
  const previewInstallmentSplitReais =
    amountMode === 'percent' && isParceledPurchase
      ? previewSplitReais / parcelCount
      : previewSplitReais

  const showAmountFields = presetMode === 'custom' || presetMode === 'half'
  const showPercentOnly = presetMode === 'half'
  const showFullDelegateHint = presetMode === 'full_other'

  return (
    <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Tipo de divisão</Label>
        <SplitModePresets variant="add" value={presetMode} onChange={setPresetMode} />
      </div>

      {isParceledPurchase && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Esta compra tem {parcelCount} parcelas
          {currentParcelLabel ? ` — você está na parcela ${currentParcelLabel}` : ''}.
          {amountMode === 'percent'
            ? ` A divisão em % será aplicada em todas as parcelas da compra (total estimado: ${formatCurrency(purchaseTotalReais)}).`
            : ' A divisão em valor fixo vale apenas para esta parcela.'}
        </p>
      )}

      {showFullDelegateHint && (
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

      {showAmountFields && !showPercentOnly && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Valor da divisão</Label>
          <ToggleGroup
            type="single"
            value={amountMode}
            onValueChange={value => value && setAmountMode(value as AmountMode)}
            className="grid w-full grid-cols-2 rounded-lg border border-slate-200 p-1"
          >
            <ToggleGroupItem
              value="fixed"
              className="rounded-md text-sm data-[state=on]:bg-slate-900 data-[state=on]:text-white"
            >
              R$
            </ToggleGroupItem>
            <ToggleGroupItem
              value="percent"
              className="rounded-md text-sm data-[state=on]:bg-slate-900 data-[state=on]:text-white"
            >
              %
            </ToggleGroupItem>
          </ToggleGroup>

          {amountMode === 'fixed' ? (
            <CurrencyInput value={splitAmount} onValueChange={setSplitAmount} />
          ) : (
            <div className="space-y-1">
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  placeholder="50"
                  value={splitPercent || ''}
                  onChange={e => setSplitPercent(Number(e.target.value))}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  %
                </span>
              </div>
              {splitPercent > 0 && (
                <p className="text-xs text-slate-500">
                  = {formatMoneyString(reaisToMoneyString(previewSplitReais))}
                  {isParceledPurchase && (
                    <>
                      {' '}
                      da compra ·{' '}
                      {formatMoneyString(reaisToMoneyString(previewInstallmentSplitReais))} por
                      parcela
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {showPercentOnly && (
        <p className="text-sm text-slate-500">
          Valor da divisão:{' '}
          <strong className="tabular-nums text-slate-800">
            {formatMoneyString(reaisToMoneyString(previewSplitReais))}
          </strong>
          {isParceledPurchase && (
            <span className="text-slate-500">
              {' '}
              · {formatMoneyString(reaisToMoneyString(previewInstallmentSplitReais))} por parcela
            </span>
          )}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={splitNotifyId} className="text-sm text-slate-600">
          Notificar esta pessoa
        </Label>
        <Switch
          id={splitNotifyId}
          checked={notifyEnabled}
          onCheckedChange={setNotifyEnabled}
        />
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
