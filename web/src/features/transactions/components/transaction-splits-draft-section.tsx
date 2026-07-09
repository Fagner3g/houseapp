import { ChevronDown, Wallet } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MemberSelect, SPLIT_MODE_LABELS } from '@/features/accounts/components/import-review-fields'
import {
  defaultSplitDraftState,
  resolveSplitAmountReais,
  type SplitDraftState,
  type SplitMode,
} from '@/features/accounts/components/import-review-types'
import { divideReais } from '@/features/transactions/installment-preview'
import { formatCurrency, formatMoneyString, moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { cn } from '@/lib/utils'

export { defaultSplitDraftState, type SplitDraftState }
export { validateSplitDraft } from '@/features/accounts/components/import-review-types'

interface TransactionSplitsDraftSectionProps {
  amountCents: string
  installmentsTotal?: number
  recurrence?: 'once' | 'installment' | 'recurring'
  value: SplitDraftState
  onChange: (value: SplitDraftState) => void
}

export function TransactionSplitsDraftSection({
  amountCents,
  installmentsTotal,
  recurrence = 'once',
  value,
  onChange,
}: TransactionSplitsDraftSectionProps) {
  const splitNotifyId = useId()
  const [open, setOpen] = useState(value.splitMode !== 'none')

  const totalReais = moneyStringToReais(amountCents)
  const splitReais = resolveSplitAmountReais(amountCents, value.splitMode, value.splitAmountReais)
  const myShareReais = Math.max(0, totalReais - splitReais)
  const isInstallment = recurrence === 'installment' && (installmentsTotal ?? 0) >= 2
  const totalInstallments = installmentsTotal ?? 0

  const perInstallmentAmounts = useMemo(() => {
    if (!isInstallment || value.splitMode === 'none') return null

    if (value.splitMode === 'custom') {
      return {
        split: divideReais(value.splitAmountReais, totalInstallments),
        myShare: divideReais(myShareReais, totalInstallments),
      }
    }

    const parcelAmounts = divideReais(totalReais, totalInstallments)
    return {
      split: parcelAmounts.map(parcel =>
        resolveSplitAmountReais(
          reaisToMoneyString(parcel),
          value.splitMode,
          value.splitAmountReais
        )
      ),
      myShare: parcelAmounts.map(parcel => {
        const splitAmount = resolveSplitAmountReais(
          reaisToMoneyString(parcel),
          value.splitMode,
          value.splitAmountReais
        )
        return Math.max(0, parcel - splitAmount)
      }),
    }
  }, [
    isInstallment,
    value.splitMode,
    value.splitAmountReais,
    totalInstallments,
    totalReais,
    myShareReais,
  ])

  const update = (patch: Partial<SplitDraftState>) => {
    onChange({ ...value, ...patch })
  }

  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
        onClick={() => setOpen(v => !v)}
      >
        <span className="flex items-center gap-2">
          <Wallet className="size-4" />
          Divisão
          {value.splitMode !== 'none' && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {SPLIT_MODE_LABELS[value.splitMode]}
            </span>
          )}
        </span>
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Tipo de divisão</Label>
            <Select
              value={value.splitMode}
              onValueChange={mode => {
                const splitMode = mode as SplitMode
                update({
                  splitMode,
                  splitAmountReais:
                    splitMode === 'half'
                      ? totalReais / 2
                      : splitMode === 'full_other'
                        ? totalReais
                        : value.splitAmountReais,
                })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SPLIT_MODE_LABELS).map(([mode, label]) => (
                  <SelectItem key={mode} value={mode}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {value.splitMode !== 'none' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Quem deve</Label>
                <Select
                  value={value.splitPersonMode}
                  onValueChange={personMode =>
                    update({ splitPersonMode: personMode as 'member' | 'contact' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membro da casa</SelectItem>
                    <SelectItem value="contact">Contato externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {value.splitPersonMode === 'member' ? (
                <MemberSelect
                  creatable
                  label="Membro"
                  value={value.splitUserId}
                  onChange={userId => update({ splitUserId: userId })}
                />
              ) : (
                <>
                  <Input
                    placeholder="Nome do contato"
                    value={value.splitContactName}
                    onChange={e => update({ splitContactName: e.target.value })}
                  />
                  <PhoneInput
                    placeholder="Telefone (WhatsApp)"
                    value={value.splitContactPhone}
                    onValueChange={splitContactPhone => update({ splitContactPhone })}
                  />
                </>
              )}

              {value.splitMode === 'custom' ? (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">Valor da divisão</Label>
                  <CurrencyInput
                    value={value.splitAmountReais}
                    onValueChange={splitAmountReais => update({ splitAmountReais })}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Valor da divisão:{' '}
                  <strong className="tabular-nums text-slate-800">
                    {formatMoneyString(reaisToMoneyString(splitReais))}
                  </strong>
                  {isInstallment && perInstallmentAmounts && (
                    <span className="text-slate-500">
                      {' '}
                      ({installmentsTotal}×{' '}
                      {formatMoneyString(reaisToMoneyString(perInstallmentAmounts.split[0] ?? 0))}{' '}
                      por parcela)
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
                  checked={value.notifyEnabled}
                  onCheckedChange={notifyEnabled => update({ notifyEnabled })}
                />
              </div>
            </>
          )}

          {value.splitMode !== 'none' && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-500">Meu valor</span>
              <strong className="tabular-nums text-slate-900">
                {formatCurrency(myShareReais)}
                {isInstallment && perInstallmentAmounts && (
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    ({installmentsTotal}×{' '}
                    {formatCurrency(perInstallmentAmounts.myShare[0] ?? 0)})
                  </span>
                )}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
