import { ChevronDown, Plus, Trash2, Wallet } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  getListSplitsQueryKey,
  getGetSplitDebtSummaryQueryKey,
  useCreateSplit,
  useDeleteSplit,
  useListSplits,
  useListUsersByOrg,
  useRegisterSplitPayment,
} from '@/api/generated/api'
import type {
  GetSplitDebtSummary200,
  GetSplitDebtSummary200PersonsItem,
  ListSplits200SplitsItemStatus,
} from '@/api/generated/model'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { formatCurrency, formatMoneyString, moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { getSplitEligibleOrgUsers } from '@/lib/org-users'
import { normalizePhoneDigits } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { getSplitTransactionIdsQueryKey } from '@/features/credit-cards/hooks/use-split-transaction-ids'
import { useQueryClient } from '@tanstack/react-query'

import { hasInstallmentSplitDebt, formatPersonShareInstallmentAmount, resolveSplitInstallmentRemainingReais } from '../split-debt-summary.utils'
import { PersonSplitDebtDetails, SplitDebtSummary } from './split-debt-summary'
import { SplitPaymentsList } from './split-payments-list'

const STATUS_LABELS: Record<ListSplits200SplitsItemStatus, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
  paid: 'Pago',
  forgiven: 'Perdoado',
}

const STATUS_VARIANT: Record<
  ListSplits200SplitsItemStatus,
  'warning' | 'partial' | 'default' | 'outline'
> = {
  pending: 'warning',
  partial: 'partial',
  paid: 'default',
  forgiven: 'outline',
}

type PersonMode = 'member' | 'contact'
type AmountMode = 'fixed' | 'percent'

interface TransactionSplitsSectionProps {
  transactionId: string
  transactionAmount: string
  installmentsTotal?: number | null
  installmentNumber?: number | null
  debtSummary?: GetSplitDebtSummary200
}

export function TransactionSplitsSection({
  transactionId,
  transactionAmount,
  installmentsTotal,
  installmentNumber,
  debtSummary,
}: TransactionSplitsSectionProps) {
  const { slug } = useActiveOrganization()
  const currentUserId = useAuthStore(s => s.user?.id)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [personMode, setPersonMode] = useState<PersonMode>('member')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [amountMode, setAmountMode] = useState<AmountMode>('fixed')
  const [splitAmount, setSplitAmount] = useState(0)
  const [splitPercent, setSplitPercent] = useState(0)
  const [paymentSplitId, setPaymentSplitId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'transfer' | 'other'>('pix')
  const splitNotifyId = useId()

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset panel when switching transactions
  useEffect(() => {
    setOpen(false)
    setShowAddForm(false)
  }, [transactionId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reopen when splits load for a new transaction
  useEffect(() => {
    if (splits.length > 0) {
      setOpen(true)
    }
  }, [splits.length, transactionId])

  const members = membersData?.users ?? []
  const splitEligibleMembers = useMemo(
    () => getSplitEligibleOrgUsers(members, currentUserId),
    [members, currentUserId]
  )
  useEffect(() => {
    if (selectedUserId && selectedUserId === currentUserId) {
      setSelectedUserId('')
    }
  }, [selectedUserId, currentUserId])

  const transactionTotalReais = moneyStringToReais(transactionAmount)
  const splitsTotalReais = splits.reduce(
    (sum, split) => sum + moneyStringToReais(split.amount),
    0
  )
  const myShareReais = Math.max(0, transactionTotalReais - splitsTotalReais)
  const parcelInstallmentsTotal = debtSummary?.installmentsTotal ?? installmentsTotal ?? 0
  const showInstallmentDebtSummary = hasInstallmentSplitDebt(debtSummary)
  const parcelCount = parcelInstallmentsTotal
  const isParceledPurchase = parcelCount > 1
  const currentParcelLabel =
    installmentNumber != null && parcelCount > 0
      ? `${installmentNumber}/${parcelCount}`
      : debtSummary?.currentInstallmentNumber != null
        ? `${debtSummary.currentInstallmentNumber}/${parcelCount}`
        : null

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

  const previewSplitReais =
    amountMode === 'percent' ? (transactionTotalReais * splitPercent) / 100 : splitAmount

  const splitPersonLabel = (split: (typeof splits)[number]) => {
    if (split.userId) {
      return members.find(member => member.id === split.userId)?.name ?? 'Membro'
    }
    return split.contactName ?? 'Contato'
  }

  const isFullyDelegated =
    splits.length > 0 && Math.abs(splitsTotalReais - transactionTotalReais) < 0.01
  const sectionTitle = isFullyDelegated
    ? `Delegada para ${splits.map(splitPersonLabel).join(', ')}`
    : 'Divisões'

  const handleDelegateToMember = async (userId: string) => {
    if (!slug) return

    const remainingReais = Math.max(0, transactionTotalReais - splitsTotalReais)
    if (remainingReais <= 0) {
      toast.error('Esta compra já está totalmente delegada ou dividida')
      return
    }

    try {
      await createSplit({
        slug,
        transactionId,
        data: {
          userId,
          amount: reaisToMoneyString(remainingReais),
          notifyEnabled: true,
        },
      })
      toast.success('Conta delegada')
      invalidate()
    } catch {
      toast.error('Erro ao delegar conta')
    }
  }

  const handleAddSplit = async () => {
    if (!slug) return

    if (personMode === 'member' && !selectedUserId) {
      toast.error('Selecione um membro')
      return
    }

    if (personMode === 'contact' && !contactName.trim()) {
      toast.error('Informe o nome do contato')
      return
    }

    const amountReais =
      amountMode === 'percent'
        ? (transactionTotalReais * splitPercent) / 100
        : splitAmount

    if (amountMode === 'percent') {
      if (splitPercent <= 0 || splitPercent > 100) {
        toast.error('Informe um percentual entre 1 e 100')
        return
      }
    } else if (splitAmount <= 0) {
      toast.error('Informe o valor da divisão')
      return
    }

    if (amountReais <= 0) {
      toast.error('O valor da divisão deve ser maior que zero')
      return
    }

    try {
      await createSplit({
        slug,
        transactionId,
        data: {
          userId: personMode === 'member' ? selectedUserId : null,
          contactName: personMode === 'contact' ? contactName.trim() : null,
          contactPhone: personMode === 'contact' ? normalizePhoneDigits(contactPhone) || null : null,
          amount: reaisToMoneyString(amountReais),
          notifyEnabled,
        },
      })
      toast.success('Divisão adicionada')
      setSelectedUserId('')
      setContactName('')
      setContactPhone('')
      setSplitAmount(0)
      setSplitPercent(0)
      setAmountMode('fixed')
      setNotifyEnabled(true)
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
        data: {
          amount: reaisToMoneyString(paymentAmount),
          method: paymentMethod,
        },
      })
      toast.success('Pagamento registrado')
      setPaymentSplitId(null)
      setPaymentAmount(0)
      invalidate()
    } catch {
      toast.error('Erro ao registrar pagamento')
    }
  }

  const openPaymentDialog = (splitId: string, remainingReais: number) => {
    setPaymentSplitId(splitId)
    setPaymentAmount(remainingReais)
    setPaymentMethod('pix')
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

  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
        onClick={() => setOpen(v => !v)}
      >
        <span className="flex items-center gap-2">
          <Wallet className="size-4" />
          {sectionTitle}
          {splits.length > 0 && !isFullyDelegated && (
            <Badge variant="secondary" className="ml-1">
              {splits.length}
            </Badge>
          )}
        </span>
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          {showInstallmentDebtSummary && debtSummary && (
            <SplitDebtSummary summary={debtSummary} />
          )}

          {isLoading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : splits.length ? (
            splits.map(split => {
              const remainingReais = resolveSplitInstallmentRemainingReais(split, {
                debtSummary,
                installmentNumber,
                installmentsTotal,
              })
              const personDebt = findPersonForSplit(split)
              const currentInstallment = personDebt?.installments.find(
                item => item.splitId === split.id
              )
              const showPersonDebtDetails =
                personDebt != null && parcelInstallmentsTotal > 1
              const parcelNumber =
                currentInstallment?.installmentNumber ??
                installmentNumber ??
                debtSummary?.currentInstallmentNumber ??
                1
              const displayInstallmentAmount =
                showPersonDebtDetails && personDebt
                  ? formatPersonShareInstallmentAmount({
                      totalOwedReais: moneyStringToReais(personDebt.totalOwed),
                      installmentsTotal: parcelInstallmentsTotal,
                      installmentNumber: parcelNumber,
                      currentSplitAmountReais: moneyStringToReais(split.amount),
                      materializedInstallmentSplits: personDebt.installments.length,
                    })
                  : split.amount
              return (
                <div key={split.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{splitPersonLabel(split)}</p>
                      <div className="mt-1 text-sm tabular-nums text-slate-700">
                        {showPersonDebtDetails && (
                          <p className="mb-1 text-xs text-slate-500">
                            Valor desta parcela
                            {parcelInstallmentsTotal > 1
                              ? ` (${parcelNumber}/${parcelInstallmentsTotal})`
                              : ''}
                          </p>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          {formatMoneyString(displayInstallmentAmount)}
                          {split.status === 'partial' && (
                            <span className="text-slate-500">
                              · falta {formatMoneyString(reaisToMoneyString(remainingReais))}
                            </span>
                          )}
                        </span>
                      </div>
                      {split.notifyEnabled && (
                        <p className="mt-1 text-xs text-slate-500">Lembretes ativos</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={STATUS_VARIANT[split.status]}>
                        {STATUS_LABELS[split.status]}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {split.status !== 'paid' && split.status !== 'forgiven' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openPaymentDialog(split.id, remainingReais)}
                          >
                            Registrar pagamento
                          </Button>
                        )}
                        {split.status === 'pending' &&
                          moneyStringToReais(split.paidAmount) === 0 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8 text-slate-400 hover:text-rose-600"
                              disabled={isDeleting}
                              aria-label="Remover divisão"
                              onClick={() => void handleDeleteSplit(split.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                      </div>
                    </div>
                  </div>

                  {showPersonDebtDetails && personDebt && debtSummary && (
                    <PersonSplitDebtDetails
                      person={personDebt}
                      currentTransactionId={transactionId}
                      installmentsTotal={debtSummary.installmentsTotal}
                    />
                  )}

                  {slug && moneyStringToReais(split.paidAmount) > 0 && (
                    <SplitPaymentsList
                      slug={slug}
                      transactionId={transactionId}
                      splitId={split.id}
                    />
                  )}
                </div>
              )
            })
          ) : (
            <p className="text-sm text-slate-500">Nenhuma divisão cadastrada.</p>
          )}

          {!showAddForm && splits.length === 0 && splitEligibleMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Delegar conta
              </p>
              <div className="flex flex-wrap gap-2">
                {splitEligibleMembers.map(member => (
                  <Button
                    key={member.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCreating}
                    onClick={() => void handleDelegateToMember(member.id)}
                  >
                    Delegar para {member.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {showAddForm ? (
            <div className="space-y-3 rounded-lg border border-dashed border-slate-200 p-3">
              {isParceledPurchase && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Esta compra tem {parcelCount} parcelas
                  {currentParcelLabel ? ` — você está na parcela ${currentParcelLabel}` : ''}.
                  A divisão adicionada aqui vale apenas para esta parcela.
                </p>
              )}
              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Quem deve</Label>
                <Select
                  value={personMode}
                  onValueChange={value => setPersonMode(value as PersonMode)}
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

              {personMode === 'member' ? (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {splitEligibleMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <Input
                    placeholder="Nome do contato"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                  />
                  <PhoneInput
                    placeholder="Telefone (WhatsApp)"
                    value={contactPhone}
                    onValueChange={setContactPhone}
                  />
                </>
              )}

              <div className="space-y-2">
                <Label className="text-sm text-slate-600">Valor da divisão</Label>
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
                      </p>
                    )}
                  </div>
                )}
              </div>

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
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-slate-900"
                  disabled={isCreating}
                  onClick={() => void handleAddSplit()}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="mr-2 size-4" />
              {splits.length > 0 ? 'Adicionar divisão' : 'Dividir com alguém'}
            </Button>
          )}

          {!showInstallmentDebtSummary && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-500">Meu valor</span>
              <strong className="tabular-nums text-slate-900">
                {formatCurrency(myShareReais)}
              </strong>
            </div>
          )}
        </div>
      )}

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
              className="bg-slate-900"
              disabled={isPaying}
              onClick={() => void handleRegisterPayment()}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
