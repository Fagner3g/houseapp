import { Wallet } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import { useListUsersByOrg } from '@/api/generated/api'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SPLIT_MODE_LABELS } from '@/features/accounts/components/import-review-fields'
import {
  defaultSplitDraftState,
  resolveSplitAmountReais,
  type SplitDraftState,
  type SplitMode,
} from '@/features/accounts/components/import-review-types'
import { divideReais } from '@/features/transactions/installment-preview'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import {
  formatCurrency,
  formatMoneyString,
  moneyStringToReais,
  reaisToMoneyString,
} from '@/lib/currency'
import { getSplitEligibleOrgUsers } from '@/lib/org-users'
import { useAuthStore } from '@/stores/auth'

import {
  DrawerCollapsibleSection,
  SplitMemberChipList,
  SplitModePresets,
  SplitMyShareRow,
  SplitParcelChargeToggle,
  SplitPersonFields,
} from './splits'

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
  const { slug } = useActiveOrganization()
  const currentUserId = useAuthStore(s => s.user?.id)
  const [open, setOpen] = useState(value.splitMode !== 'none')

  const { data: membersData } = useListUsersByOrg(slug, {
    query: { enabled: !!slug && open },
  })

  const totalReais = moneyStringToReais(amountCents)
  const splitReais = resolveSplitAmountReais(amountCents, value.splitMode, value.splitAmountReais)
  const myShareReais = Math.max(0, totalReais - splitReais)
  const isInstallment = recurrence === 'installment' && (installmentsTotal ?? 0) >= 2
  const totalInstallments = installmentsTotal ?? 0
  const showParcelChargeToggle =
    isInstallment && (value.splitMode === 'half' || value.splitMode === 'custom')
  const chargePerInstallment = showParcelChargeToggle && !value.collectLumpSum

  const splitEligibleMembers = useMemo(
    () => getSplitEligibleOrgUsers(membersData?.users ?? [], currentUserId),
    [membersData?.users, currentUserId]
  )

  const selectedMemberName = value.splitUserId
    ? membersData?.users?.find(member => member.id === value.splitUserId)?.name
    : undefined

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

  const handleModeChange = (splitMode: SplitMode) => {
    update({
      splitMode,
      splitAmountReais:
        splitMode === 'half'
          ? totalReais / 2
          : splitMode === 'full_other'
            ? totalReais
            : value.splitAmountReais,
    })
  }

  const handleQuickDelegate = (userId: string) => {
    update({
      splitMode: 'full_other',
      splitPersonMode: 'member',
      splitUserId: userId,
      splitAmountReais: totalReais,
      notifyEnabled: true,
    })
  }

  const headerSummary =
    value.splitMode !== 'none' ? (
      <span className="ml-1 flex flex-wrap gap-1">
        <Badge variant="secondary" className="font-normal">
          {SPLIT_MODE_LABELS[value.splitMode]}
        </Badge>
        {selectedMemberName && (
          <Badge variant="secondary" className="font-normal">
            {selectedMemberName}
          </Badge>
        )}
      </span>
    ) : undefined

  return (
    <DrawerCollapsibleSection
      icon={Wallet}
      title="Divisão"
      summary={headerSummary}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Tipo de divisão</Label>
          <SplitModePresets
            variant="draft"
            value={value.splitMode}
            onChange={handleModeChange}
          />
        </div>

        {value.splitMode === 'none' && splitEligibleMembers.length > 0 && (
          <SplitMemberChipList
            members={splitEligibleMembers}
            onSelect={handleQuickDelegate}
            label="Ou delegar para"
          />
        )}

        {value.splitMode !== 'none' && (
          <>
            {showParcelChargeToggle && (
              <SplitParcelChargeToggle
                checked={!value.collectLumpSum}
                onCheckedChange={parcelCharge => update({ collectLumpSum: !parcelCharge })}
                banner={
                  chargePerInstallment
                    ? `A divisão será aplicada em todas as ${totalInstallments} parcelas.`
                    : `A cobrança será à vista na 1ª parcela (valor total da divisão: ${formatCurrency(splitReais)}).`
                }
              />
            )}

            <SplitPersonFields
              personMode={value.splitPersonMode}
              onPersonModeChange={personMode => update({ splitPersonMode: personMode })}
              selectedUserId={value.splitUserId}
              onSelectedUserIdChange={userId => update({ splitUserId: userId })}
              contactName={value.splitContactName}
              onContactNameChange={splitContactName => update({ splitContactName })}
              contactPhone={value.splitContactPhone}
              onContactPhoneChange={splitContactPhone => update({ splitContactPhone })}
            />

            {value.splitMode === 'custom' ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Valor da divisão</Label>
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
                {chargePerInstallment && perInstallmentAmounts && (
                  <span className="text-slate-500">
                    {' '}
                    ({installmentsTotal}×{' '}
                    {formatMoneyString(reaisToMoneyString(perInstallmentAmounts.split[0] ?? 0))}{' '}
                    por parcela)
                  </span>
                )}
                {showParcelChargeToggle && !chargePerInstallment && (
                  <span className="text-slate-500"> · à vista na 1ª parcela</span>
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
      </div>

      {value.splitMode !== 'none' && (
        <SplitMyShareRow
          amountReais={myShareReais}
          suffix={
            chargePerInstallment && perInstallmentAmounts ? (
              <span className="ml-1 text-xs font-normal text-slate-500">
                ({installmentsTotal}× {formatCurrency(perInstallmentAmounts.myShare[0] ?? 0)})
              </span>
            ) : undefined
          }
        />
      )}
    </DrawerCollapsibleSection>
  )
}
