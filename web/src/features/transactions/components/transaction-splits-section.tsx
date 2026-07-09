import { Plus, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import {
  getListSplitsQueryKey,
  getGetSplitDebtSummaryQueryKey,
  useCreateSplit,
  useDeleteSplit,
  useListSplits,
  useListUsersByOrg,
  useRegisterSplitPayment,
} from '@/api/generated/api'
import type { GetSplitDebtSummary200, GetSplitDebtSummary200PersonsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { getSplitEligibleOrgUsers } from '@/lib/org-users'
import { normalizePhoneDigits } from '@/lib/phone'
import { stackyPrimaryButton } from '@/lib/ui-classes'
import { useAuthStore } from '@/stores/auth'
import { getSplitTransactionIdsQueryKey } from '@/features/credit-cards/hooks/use-split-transaction-ids'

import { hasInstallmentSplitDebt } from '../split-debt-summary.utils'
import { SplitDebtSummary } from './split-debt-summary'
import {
  DrawerCollapsibleSection,
  SplitAddForm,
  type SplitAddFormValues,
  SplitEmptyState,
  SplitList,
  SplitListItem,
  SplitMemberChipList,
  SplitMyShareRow,
} from './splits'

type InstallmentSibling = { id: string; amount: string }

interface TransactionSplitsSectionProps {
  transactionId: string
  transactionAmount: string
  installmentsTotal?: number | null
  installmentNumber?: number | null
  debtSummary?: GetSplitDebtSummary200
  installmentSiblings?: InstallmentSibling[]
}

export function TransactionSplitsSection({
  transactionId,
  transactionAmount,
  installmentsTotal,
  installmentNumber,
  debtSummary,
  installmentSiblings,
}: TransactionSplitsSectionProps) {
  const { slug } = useActiveOrganization()
  const currentUserId = useAuthStore(s => s.user?.id)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [paymentSplitId, setPaymentSplitId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'transfer' | 'other'>('pix')

  const { data: membersData } = useListUsersByOrg(slug, {
    query: { enabled: !!slug && open },
  })
  const { data, isLoading } = useListSplits(slug, transactionId, {
    query: { enabled: !!slug && !!transactionId },
  })

  const { mutateAsync: createSplit, isPending: isCreating } = useCreateSplit()
  const { mutateAsync: deleteSplit, isPending: isDeleting } = useDeleteSplit()
  const { mutateAsync: registerPayment, isPending: isPaying } = useRegisterSplitPayment()

  const splits = data?.splits ?? []
  const members = membersData?.users ?? []
  const splitEligibleMembers = useMemo(
    () => getSplitEligibleOrgUsers(members, currentUserId),
    [members, currentUserId]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset panel when switching transactions
  useEffect(() => {
    setOpen(false)
    setShowAddForm(false)
  }, [transactionId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reopen when splits load for a new transaction
  useEffect(() => {
    if (splits.length > 0) setOpen(true)
  }, [splits.length, transactionId])

  const transactionTotalReais = moneyStringToReais(transactionAmount)
  const parcelCount = debtSummary?.installmentsTotal ?? installmentsTotal ?? 0
  const isParceledPurchase = parcelCount > 1
  const purchaseTotalReais = debtSummary?.purchaseTotal
    ? moneyStringToReais(debtSummary.purchaseTotal)
    : isParceledPurchase
      ? transactionTotalReais * parcelCount
      : transactionTotalReais
  const splitsTotalReais = splits.reduce(
    (sum, split) => sum + moneyStringToReais(split.amount),
    0
  )
  const remainingReais = Math.max(0, transactionTotalReais - splitsTotalReais)
  const myShareReais = remainingReais
  const showInstallmentDebtSummary = hasInstallmentSplitDebt(debtSummary)
  const currentParcelLabel =
    installmentNumber != null && parcelCount > 0
      ? `${installmentNumber}/${parcelCount}`
      : debtSummary?.currentInstallmentNumber != null
        ? `${debtSummary.currentInstallmentNumber}/${parcelCount}`
        : null

  const splitPersonLabel = (split: (typeof splits)[number]) => {
    if (split.userId) {
      return members.find(member => member.id === split.userId)?.name ?? 'Membro'
    }
    return split.contactName ?? 'Contato'
  }

  const findPersonForSplit = (
    split: (typeof splits)[number]
  ): GetSplitDebtSummary200PersonsItem | undefined => {
    if (!debtSummary) return undefined
    return debtSummary.persons.find(person => {
      if (split.userId) return person.userId === split.userId
      return (
        (person.contactName ?? '').trim() === (split.contactName ?? '').trim() &&
        (person.contactPhone ?? '').trim() === (split.contactPhone ?? '').trim()
      )
    })
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListSplitsQueryKey(slug, transactionId) })
    queryClient.invalidateQueries({
      queryKey: getGetSplitDebtSummaryQueryKey(slug, transactionId),
    })
    queryClient.invalidateQueries({ queryKey: getSplitTransactionIdsQueryKey(slug) })
  }

  const handleDelegateToMember = async (userId: string) => {
    if (!slug) return
    if (remainingReais <= 0) {
      toast.error('Esta compra já está totalmente delegada ou dividida')
      return
    }
    try {
      await createSplit({
        slug,
        transactionId,
        data: { userId, amount: reaisToMoneyString(remainingReais), notifyEnabled: true },
      })
      toast.success('Conta delegada')
      invalidate()
    } catch {
      toast.error('Erro ao delegar conta')
    }
  }

  const handleAddSplit = async (values: SplitAddFormValues) => {
    if (!slug) return

    if (values.personMode === 'member' && !values.selectedUserId) {
      toast.error('Selecione um membro')
      return
    }
    if (values.personMode === 'contact' && !values.contactName.trim()) {
      toast.error('Informe o nome do contato')
      return
    }

    const splitTargets =
      values.amountMode === 'percent' && isParceledPurchase && installmentSiblings?.length
        ? installmentSiblings
        : [{ id: transactionId, amount: transactionAmount }]

    const amountReais =
      values.amountMode === 'percent'
        ? (purchaseTotalReais * values.splitPercent) / 100
        : values.splitAmount

    if (values.amountMode === 'percent') {
      if (values.splitPercent <= 0 || values.splitPercent > 100) {
        toast.error('Informe um percentual entre 1 e 100')
        return
      }
    } else if (values.splitAmount <= 0) {
      toast.error('Informe o valor da divisão')
      return
    }

    if (amountReais <= 0) {
      toast.error('O valor da divisão deve ser maior que zero')
      return
    }

    const splitData = {
      userId: values.personMode === 'member' ? values.selectedUserId : null,
      contactName: values.personMode === 'contact' ? values.contactName.trim() : null,
      contactPhone:
        values.personMode === 'contact' ? normalizePhoneDigits(values.contactPhone) || null : null,
      description: 'Divisão da despesa',
      notifyEnabled: values.notifyEnabled,
    }

    try {
      for (const target of splitTargets) {
        const targetAmountReais =
          values.amountMode === 'percent' && isParceledPurchase
            ? (moneyStringToReais(target.amount) * values.splitPercent) / 100
            : amountReais
        if (targetAmountReais <= 0) continue
        await createSplit({
          slug,
          transactionId: target.id,
          data: { ...splitData, amount: reaisToMoneyString(targetAmountReais) },
        })
      }
      toast.success('Divisão adicionada')
      setShowAddForm(false)
      invalidate()
    } catch {
      toast.error('Erro ao adicionar divisão')
    }
  }

  const handleRegisterPayment = async () => {
    if (!slug || !paymentSplitId || paymentAmount <= 0) return
    try {
      await registerPayment({
        slug,
        transactionId,
        id: paymentSplitId,
        data: { amount: reaisToMoneyString(paymentAmount), method: paymentMethod },
      })
      toast.success('Pagamento registrado')
      setPaymentSplitId(null)
      setPaymentAmount(0)
      invalidate()
    } catch {
      toast.error('Erro ao registrar pagamento')
    }
  }

  const handleDeleteSplit = async (splitId: string) => {
    if (!slug) return
    try {
      await deleteSplit({ slug, transactionId, id: splitId })
      toast.success('Divisão removida')
      invalidate()
    } catch {
      toast.error('Erro ao remover divisão')
    }
  }

  const headerSummary =
    splits.length > 0 ? (
      <span className="ml-1 flex flex-wrap gap-1">
        {splits.map(split => (
          <Badge key={split.id} variant="secondary" className="font-normal">
            {splitPersonLabel(split)}
          </Badge>
        ))}
      </span>
    ) : undefined

  return (
    <>
      <DrawerCollapsibleSection
        icon={Wallet}
        title="Divisões"
        summary={headerSummary}
        open={open}
        onOpenChange={setOpen}
      >
        {showInstallmentDebtSummary && debtSummary && (
          <SplitDebtSummary summary={debtSummary} />
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : splits.length > 0 && slug ? (
          <SplitList>
            {splits.map(split => (
              <SplitListItem
                key={split.id}
                split={split}
                personLabel={splitPersonLabel(split)}
                slug={slug}
                transactionId={transactionId}
                debtSummary={debtSummary}
                personDebt={findPersonForSplit(split)}
                installmentNumber={installmentNumber}
                installmentsTotal={installmentsTotal}
                parcelInstallmentsTotal={parcelCount}
                onRegisterPayment={(id, remaining) => {
                  setPaymentSplitId(id)
                  setPaymentAmount(remaining)
                  setPaymentMethod('pix')
                }}
                onDelete={id => void handleDeleteSplit(id)}
                isDeleting={isDeleting}
              />
            ))}
          </SplitList>
        ) : (
          <SplitEmptyState />
        )}

        {!showAddForm && splits.length === 0 && (
          <SplitMemberChipList
            members={splitEligibleMembers}
            disabled={isCreating}
            onSelect={userId => void handleDelegateToMember(userId)}
          />
        )}

        {showAddForm ? (
          <SplitAddForm
            remainingReais={remainingReais}
            purchaseTotalReais={purchaseTotalReais}
            isParceledPurchase={isParceledPurchase}
            parcelCount={parcelCount}
            currentParcelLabel={currentParcelLabel}
            isSubmitting={isCreating}
            onSubmit={values => void handleAddSplit(values)}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="mr-2 size-4" />
            {splits.length > 0 ? 'Adicionar divisão' : 'Dividir despesa'}
          </Button>
        )}

        {!showInstallmentDebtSummary && splits.length > 0 && (
          <SplitMyShareRow amountReais={myShareReais} />
        )}
      </DrawerCollapsibleSection>

      <Dialog open={!!paymentSplitId} onOpenChange={v => !v && setPaymentSplitId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="mb-2 text-sm text-slate-600">Valor recebido</p>
              <CurrencyInput value={paymentAmount} onValueChange={setPaymentAmount} />
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-600">Forma de pagamento</p>
              <Select
                value={paymentMethod}
                onValueChange={v =>
                  setPaymentMethod(v as 'pix' | 'cash' | 'transfer' | 'other')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentSplitId(null)}>
              Cancelar
            </Button>
            <Button
              className={stackyPrimaryButton}
              disabled={isPaying}
              onClick={() => void handleRegisterPayment()}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
