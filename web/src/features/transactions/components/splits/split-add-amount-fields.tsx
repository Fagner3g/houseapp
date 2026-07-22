import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatMoneyString, reaisToMoneyString } from '@/lib/currency'

type AmountMode = 'fixed' | 'percent'

interface SplitAddAmountFieldsProps {
  amountMode: AmountMode
  onAmountModeChange: (mode: AmountMode) => void
  splitAmount: number
  onSplitAmountChange: (value: number) => void
  splitPercent: number
  onSplitPercentChange: (value: number) => void
  previewSplitReais: number
  previewInstallmentSplitReais: number
  chargePerInstallment: boolean
  showParcelChargeToggle: boolean
  parcelCharge: boolean
  showPercentOnly: boolean
}

export function SplitAddAmountFields({
  amountMode,
  onAmountModeChange,
  splitAmount,
  onSplitAmountChange,
  splitPercent,
  onSplitPercentChange,
  previewSplitReais,
  previewInstallmentSplitReais,
  chargePerInstallment,
  showParcelChargeToggle,
  parcelCharge,
  showPercentOnly,
}: SplitAddAmountFieldsProps) {
  if (showPercentOnly) {
    return (
      <p className="text-sm text-slate-500">
        Valor da divisão:{' '}
        <strong className="tabular-nums text-slate-800">
          {formatMoneyString(reaisToMoneyString(previewSplitReais))}
        </strong>
        {chargePerInstallment && (
          <span className="text-slate-500">
            {' '}
            · {formatMoneyString(reaisToMoneyString(previewInstallmentSplitReais))} por parcela
          </span>
        )}
        {showParcelChargeToggle && !parcelCharge && (
          <span className="text-slate-500"> · à vista nesta parcela</span>
        )}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">Valor da divisão</Label>
      <ToggleGroup
        type="single"
        value={amountMode}
        onValueChange={value => value && onAmountModeChange(value as AmountMode)}
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
        <CurrencyInput value={splitAmount} onValueChange={onSplitAmountChange} />
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
              onChange={e => onSplitPercentChange(Number(e.target.value))}
              className="pr-8"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              %
            </span>
          </div>
          {splitPercent > 0 && (
            <p className="text-xs text-slate-500">
              = {formatMoneyString(reaisToMoneyString(previewSplitReais))}
              {chargePerInstallment && (
                <>
                  {' '}
                  da compra ·{' '}
                  {formatMoneyString(reaisToMoneyString(previewInstallmentSplitReais))} por parcela
                </>
              )}
              {showParcelChargeToggle && !parcelCharge && ' da compra (à vista)'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
