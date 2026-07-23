import { Plus, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import {
  getListSplitsQueryKey,
  getGetSplitDebtSummaryQueryKey,
  useCreateCollectPlan,
  useCreateSplit,
  useCreateSplitPaymentRequest,
  useDeleteSplit,
  useListSplits,
  useListUsersByOrg,
  useRegisterSplitPayment,
} from '@/api/generated/api'
import type { GetSplitDebtSummary200, GetSplitDebtSummary200PersonsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { getSplitEligibleOrgUsers } from '@/lib/org-users'
import { normalizePhoneDigits } from '@/lib/phone'
import { useAuthStore } from '@/stores/auth'
import { getSplitTransactionIdsQueryKey } from '@/features/credit-cards/hooks/use-split-transaction-ids'

import { hasInstallmentSplitDebt } from '../split-debt-summary.utils'
import { markSplitReceivedSuccessToast } from '../lib/split-reimbursement-copy'
import { syncAfterSplitReceipt } from '../lib/sync-after-split-receipt'
import type { SplitPaymentMethod } from '../lib/unified-settlement'
import { MarkSplitReceivedDialog } from './mark-split-received-dialog'
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
  const [markReceivedSplitId, setMarkReceivedSplitId] = useState<string | null>(null)

  const { data: membersData } = useListUsersByOrg(slug, {
    query: { enabled: !!slug && open },
  })
  const { data, isLoading } = useListSplits(slug, transactionId, {
    query: { enabled: !!slug && !!transactionId },
  })

  const { mutateAsync: createSplit, isPending: isCreating } = useCreateSplit()
  const { mutateAsync: createCollectPlan, isPending: isCreatingCollectPlan } =
    useCreateCollectPlan()
  const { mutateAsync: deleteSplit, isPending: isDeleting } = useDeleteSplit()
  const { mutateAsync: createPaymentRequest, isPending: isRequestingPayment } =
    useCreateSplitPaymentRequest()
  const { mutateAsync: registerSplitPayment, isPending: isMarkingReceived } =
    useRegisterSplitPayment()
  const isSubmittingSplit = isCreating || isCreatingCollectPlan

  const splits = data?.splits ?? []
  const viewerIsCreditor = data?.viewerIsCreditor ?? false
  const viewerCanMutate = data?.viewerCanMutate ?? false
  const members = membersData?.users ?? []
  const splitEligibleMembers = useMemo(
    () => getSplitEligibleOrgUsers(members, currentUserId),
    [members, currentUserId]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset panel when switching transactions
  useEffect(() => {
    setOpen(false)
    setShowAddForm(false)
    setMarkReceivedSplitId(null)
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
  const showInstallmentDebtSummary = hasInstallmentSplitDebt(debtSummary)
  const viewerSplit = splits.find(split => split.userId === currentUserId)
  const myShareReais =
    !viewerIsCreditor && viewerSplit
      ? moneyStringToReais(viewerSplit.amount)
      : !viewerIsCreditor && debtSummary?.viewerOwedTotal != null
        ? moneyStringToReais(debtSummary.viewerOwedTotal)
        : remainingReais
  const currentParcelLabel =
    installmentNumber != null && parcelCount > 0
      ? `${installmentNumber}/${parcelCount}`
      : debtSummary?.currentInstallmentNumber != null
        ? `${debtSummary.currentInstallmentNumber}/${parcelCount}`
        : null

  const splitPersonLabel = (split: (typeof splits)[number]) => {
    if (split.userId && split.userId === currentUserId) return 'Você'
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

    const collectLumpSum =
      values.amountMode === 'percent' && isParceledPurchase && !values.parcelCharge

    if (values.collectPlan && !isParceledPurchase && values.amountMode === 'percent') {
      const amountReais = (purchaseTotalReais * values.splitPercent) / 100
      if (values.splitPercent <= 0 || values.splitPercent > 100) {
        toast.error('Informe um percentual entre 1 e 100')
        return
      }
      if (amountReais <= 0) {
        toast.error('O valor da divisão deve ser maior que zero')
        return
      }
      if (!values.collectStartDate) {
        toast.error('Informe a data do 1º vencimento')
        return
      }
      try {
        await createCollectPlan({
          slug,
          transactionId,
          data: {
            userId: values.personMode === 'member' ? values.selectedUserId : null,
            contactName: values.personMode === 'contact' ? values.contactName.trim() : null,
            contactPhone:
              values.personMode === 'contact'
                ? normalizePhoneDigits(values.contactPhone) || null
                : null,
            description: 'Divisão da despesa',
            notifyEnabled: values.notifyEnabled,
            amount: reaisToMoneyString(amountReais),
            installmentsTotal: values.collectInstallmentsTotal,
            startDate: values.collectStartDate,
          },
        })
        toast.success('Divisão parcelada adicionada')
        setShowAddForm(false)
        invalidate()
      } catch {
        toast.error('Erro ao adicionar divisão parcelada')
      }
      return
    }

    const splitTargets =
      values.amountMode === 'percent' &&
      isParceledPurchase &&
      values.parcelCharge &&
      installmentSiblings?.length
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
      collectLumpSum,
    }

    try {
      for (const target of splitTargets) {
        const targetAmountReais = collectLumpSum
          ? amountReais
          : values.amountMode === 'percent' && isParceledPurchase
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

  const handleRequestPaymentConfirmation = async (splitId: string) => {
    if (!slug) return
    try {
      await createPaymentRequest({
        slug,
        transactionId,
        id: splitId,
        data: {},
      })
      toast.success('Pedido de confirmação enviado')
      invalidate()
    } catch {
      toast.error('Erro ao enviar pedido de confirmação')
    }
  }

  const markReceivedSplit = markReceivedSplitId
    ? splits.find(item => item.id === markReceivedSplitId)
    : undefined
  const markReceivedRemainingReais = markReceivedSplit
    ? Math.max(
        0,
        moneyStringToReais(markReceivedSplit.amount) -
          moneyStringToReais(markReceivedSplit.paidAmount)
      )
    : 0

  const handleConfirmMarkReceived = async (input: {
    amountReais: number
    method: SplitPaymentMethod
  }) => {
    if (!slug || !markReceivedSplitId) return
    if (input.amountReais <= 0 || markReceivedRemainingReais <= 0) {
      toast.error('Esta divisão já está quitada')
      return
    }

    const isPartial = input.amountReais < markReceivedRemainingReais - 0.005

    try {
      const result = await registerSplitPayment({
        slug,
        transactionId,
        id: markReceivedSplitId,
        data: {
          amount: reaisToMoneyString(input.amountReais),
          method: input.method,
        },
      })
      await syncAfterSplitReceipt(queryClient, slug, transactionId, result)
      setMarkReceivedSplitId(null)
      toast.success(markSplitReceivedSuccessToast(isPartial))
    } catch {
      toast.error('Erro ao registrar recebimento')
    }
  }

  const headerSummary =
    splits.length > 0 ? (
      <span className="ml-1 flex flex-wrap gap-1">
        {[...new Map(splits.map(split => [splitPersonLabel(split), split])).values()].map(
          split => (
            <Badge key={split.id} variant="secondary" className="font-normal">
              {splitPersonLabel(split)}
            </Badge>
          )
        )}
      </span>
    ) : undefined

  // One card per collect-plan (or per standalone split); details list the parcels.
  const listSplits = (() => {
    const seenPlans = new Set<string>()
    return splits.filter(split => {
      if (!split.collectPlanId) return true
      if (seenPlans.has(split.collectPlanId)) return false
      seenPlans.add(split.collectPlanId)
      return true
    })
  })()

  return (
      <DrawerCollapsibleSection
        icon={Wallet}
        title="Divisões"
        summary={headerSummary}
        open={open}
        onOpenChange={setOpen}
      >
        {showInstallmentDebtSummary && debtSummary && (
          <SplitDebtSummary
            summary={{
              purchaseTotal: debtSummary.purchaseTotal,
              installmentsTotal: debtSummary.installmentsTotal,
              purchaseIsParceled: isParceledPurchase,
              myShareTotal:
                !debtSummary.viewerIsCreditor && debtSummary.viewerOwedTotal != null
                  ? debtSummary.viewerOwedTotal
                  : debtSummary.myShareTotal,
            }}
          />
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : splits.length > 0 && slug ? (
          <SplitList>
            {listSplits.map(split => (
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
                parcelInstallmentsTotal={
                  split.collectInstallmentsTotal && split.collectInstallmentsTotal >= 2
                    ? split.collectInstallmentsTotal
                    : parcelCount
                }
                viewerIsCreditor={viewerIsCreditor}
                viewerCanMutate={viewerCanMutate}
                onRequestPaymentConfirmation={id =>
                  void handleRequestPaymentConfirmation(id)
                }
                onMarkReceived={id => setMarkReceivedSplitId(id)}
                onDelete={id => void handleDeleteSplit(id)}
                isDeleting={isDeleting}
                isRequestingPayment={isRequestingPayment}
                isMarkingReceived={isMarkingReceived}
              />
            ))}
          </SplitList>
        ) : (
          <SplitEmptyState />
        )}

        {markReceivedSplit && (
          <MarkSplitReceivedDialog
            open={markReceivedSplitId != null}
            onOpenChange={nextOpen => {
              if (!nextOpen) setMarkReceivedSplitId(null)
            }}
            personLabel={splitPersonLabel(markReceivedSplit)}
            remainingReais={markReceivedRemainingReais}
            isPending={isMarkingReceived}
            onConfirm={handleConfirmMarkReceived}
          />
        )}

        {viewerCanMutate && !showAddForm && splits.length === 0 && (
          <SplitMemberChipList
            members={splitEligibleMembers}
            disabled={isSubmittingSplit}
            onSelect={userId => void handleDelegateToMember(userId)}
          />
        )}

        {viewerCanMutate &&
          (showAddForm ? (
            <SplitAddForm
              remainingReais={remainingReais}
              purchaseTotalReais={purchaseTotalReais}
              isParceledPurchase={isParceledPurchase}
              parcelCount={parcelCount}
              currentParcelLabel={currentParcelLabel}
              isSubmitting={isSubmittingSplit}
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
          ))}

        {!showInstallmentDebtSummary && splits.length > 0 && (
          <SplitMyShareRow amountReais={myShareReais} />
        )}
      </DrawerCollapsibleSection>
  )
}
