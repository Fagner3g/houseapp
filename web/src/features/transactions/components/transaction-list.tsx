import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Check, ChevronRight, CreditCard, Loader2, RefreshCw, Tag, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'

import {
  useDeleteTransaction,
  useListAccounts,
  useListCategories,
  useUpdateTransaction,
} from '@/api/generated/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { invalidateTransactionQueries } from '@/features/transactions/lib/invalidate-transaction-queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCentsString, reaisToMoneyString } from '@/lib/currency'
import { transactionPurchaseDate } from '@/lib/credit-card-invoice-metrics'
import { formatIsoDateLabel, isoToCalendarDate } from '@/lib/date'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'
import { cn } from '@/lib/utils'
import { CategorySelect } from '@/features/categories/components/category-select'
import { useSplitTransactionIds } from '@/features/credit-cards/hooks/use-split-transaction-ids'
import type {
  DelegatedSplitBadgeInfo,
  ViewerShareEntry,
} from '@/features/credit-cards/hooks/use-split-transaction-ids'
import {
  formatDelegatedSplitBadge,
  formatPartialSplitBadge,
  partialSplitBadgeClassName,
  resolveSplitBadgePerspective,
  resolveTransactionSplitBadgeSettlement,
  splitBadgeClassName,
  type PartialSplitBadgeInfo,
} from '@/features/transactions/lib/split-badge-label'
import { useAuthStore } from '@/stores/auth'
import { isInvoiceSummary, type TransactionListItem } from '@/features/transactions/types'
import { TransactionInlineCreateBar } from './transaction-inline-create-bar'
import { DeleteTransactionDialog } from './delete-transaction-dialog'
import { canDeleteTransaction } from '@/features/transactions/utils/can-delete-transaction'
import {
  getPayableStatusBadges,
  isFutureScheduled,
  isOverduePayable,
} from '@/features/transactions/lib/payable-status'
import { resolveTransactionListAmountReais, isTransactionPartiallyPaid } from '@/features/transactions/installment-amount.utils'

type TransactionRow = Extract<TransactionListItem, { kind: 'transaction' }>

interface TransactionListProps {
  items: TransactionListItem[]
  showPayAction?: boolean
  /** Hides status and pay actions — for credit card statement lines (purchases are not individually payable). */
  variant?: 'default' | 'credit_card_statement'
  mode?: 'default' | 'overdue'
  /** When set, new transactions are created on this account and the account column is hidden. */
  accountId?: string
  /** When multiple cards exist, shows which card made each purchase. */
  cards?: Array<{ id: string; label: string; lastFourDigits?: string | null }>
  /** Map of transaction id → fully delegated split badge info. */
  fullyDelegatedById?: Map<string, DelegatedSplitBadgeInfo>
  /** Map of transaction id → partial split info for badge labels. */
  partiallyDividedById?: Map<string, PartialSplitBadgeInfo & { debtorUserId?: string | null; creditorName?: string }>
  /** Map of transaction id → total paid on splits. */
  splitPaidById?: Map<string, number>
  /** Map of transaction id → remaining split amount still to collect. */
  splitRemainingById?: Map<string, number>
  /** Map of transaction id → current user's debtor share amounts. */
  viewerShareById?: Map<string, ViewerShareEntry>
  /** When false, hides the inline create row (e.g. credit card after first statement import). */
  allowInlineCreate?: boolean
  containerClassName?: string
}

function isCreditCardExpense(
  tx: Extract<TransactionListItem, { kind: 'transaction' }>,
  accounts: { id: string; type: string }[] | undefined
) {
  const account = accounts?.find(a => a.id === tx.accountId)
  return account?.type === 'credit_card' && tx.type === 'expense'
}

function isOverdue(tx: Extract<TransactionListItem, { kind: 'transaction' }>) {
  return isOverduePayable(tx) && !isFutureScheduled(tx)
}

function getPayableListDate(tx: TransactionRow) {
  const dueKey = isoToCalendarDate(tx.date)
  const scheduledKey = tx.paymentScheduledAt
    ? isoToCalendarDate(tx.paymentScheduledAt)
    : null

  if (scheduledKey && scheduledKey !== dueKey) {
    return {
      displayDay: scheduledKey,
      dueSubtext: `Venc. ${formatIsoDateLabel(tx.date)}`,
      showScheduledBadge: true,
    }
  }

  if (scheduledKey) {
    return {
      displayDay: scheduledKey,
      dueSubtext: null,
      showScheduledBadge: false,
    }
  }

  return {
    displayDay: dueKey,
    dueSubtext: null,
    showScheduledBadge: false,
  }
}

function getStatusLabel(item: TransactionListItem): string {
  if (isInvoiceSummary(item)) {
    if (item.status === 'paid') return 'Paga'
    if (item.overdueKind === 'receivable') return 'A receber'
    const remaining = Number(item.remaining ?? item.amount)
    const payments = Number(item.payments ?? 0)
    if (payments > 0 && remaining > 0) return 'Parcial'
    return 'Em aberto'
  }
  const tx = item
  if (tx.status === 'canceled') return 'Cancelado'
  if (tx.status === 'paid') return tx.type === 'income' ? 'Recebido' : 'Pago'
  if (tx.status === 'partial') return 'Parcial'
  return 'Pendente'
}

function getStatusVariant(
  item: TransactionListItem
): 'default' | 'secondary' | 'outline' | 'warning' {
  if (isInvoiceSummary(item)) {
    return item.status === 'paid' ? 'secondary' : 'outline'
  }
  const tx = item
  if (tx.status === 'paid') return 'secondary'
  if (tx.status === 'canceled') return 'outline'
  return 'outline'
}

function TransactionTable({
  items,
  showPayAction = true,
  variant = 'default',
  mode = 'default',
  accountId,
  cards,
  fullyDelegatedById,
  partiallyDividedById,
  splitPaidById,
  splitRemainingById,
  viewerShareById,
  allowInlineCreate = true,
  containerClassName,
}: TransactionListProps) {
  const isCreditCardStatement = variant === 'credit_card_statement'
  const showCardLabel = isCreditCardStatement && !!cards?.length
  const showStatusColumn = !isCreditCardStatement
  const showPayActionColumn = !isCreditCardStatement && showPayAction
  const showDeleteActionColumn = isCreditCardStatement
  const showActionsColumn = showPayActionColumn || showDeleteActionColumn
  const { slug } = useActiveOrganization()
  const currentUserId = useAuthStore(s => s.user?.id)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: accounts } = useListAccounts(slug, { query: { enabled: !!slug } })
  const { data: categories } = useListCategories(slug, { query: { enabled: !!slug } })
  const { mutateAsync: updateTransaction, isPending: isUpdatingCategory } = useUpdateTransaction()
  const { mutateAsync: deleteTransaction, isPending: isDeletingBulk } = useDeleteTransaction()
  const openDrawer = useDrawerStore(s => s.openTransactionDrawer)
  const openPayDrawer = useDrawerStore(s => s.openTransactionPayDrawer)
  const openRecurringContractDrawer = useDrawerStore(s => s.openRecurringContractDrawer)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('')
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null)

  const accountName = (id: string | null) =>
    accounts?.accounts?.find(a => a.id === id)?.name ?? '—'

  const categoryLabel = (ids: string[]) => {
    if (!ids.length) return null
    const cat = categories?.categories?.find(c => c.id === ids[0])
    return cat?.name ?? '—'
  }

  const cardLabel = (cardId: string | null | undefined) => {
    if (!cardId) return null
    const card = cards?.find(c => c.id === cardId)
    if (!card) return null
    return card.lastFourDigits ? `${card.label} · ${card.lastFourDigits}` : card.label
  }

  const selectableItems = useMemo(
    () => items.filter((item): item is TransactionRow => !isInvoiceSummary(item)),
    [items]
  )

  const selectedTransactions = useMemo(
    () => selectableItems.filter(item => selected.has(item.id)),
    [selectableItems, selected]
  )

  const deletableSelected = useMemo(
    () => selectedTransactions.filter(canDeleteTransaction),
    [selectedTransactions]
  )

  const bulkCategoryType = useMemo(() => {
    const types = new Set(selectedTransactions.map(item => item.type))
    if (types.size !== 1) return null
    const [type] = types
    return type === 'income' || type === 'expense' ? type : null
  }, [selectedTransactions])

  useEffect(() => {
    setSelected(prev => {
      const validIds = new Set(items.map(item => item.id))
      const next = new Set([...prev].filter(id => validIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [items])

  const allSelected =
    selectableItems.length > 0 && selectableItems.every(item => selected.has(item.id))

  const invalidateQueries = async () => {
    if (!slug) return
    await invalidateTransactionQueries(queryClient, slug)
  }

  const applyBulkCategory = async () => {
    if (!slug || selectedTransactions.length === 0) return
    if (!bulkCategoryId) {
      toast.error('Selecione uma categoria')
      return
    }
    if (!bulkCategoryType) {
      toast.error('Selecione lançamentos do mesmo tipo (despesa ou receita)')
      return
    }

    try {
      await Promise.all(
        selectedTransactions.map(item =>
          updateTransaction({
            slug,
            id: item.id,
            data: { categoryIds: [bulkCategoryId] },
          })
        )
      )
      await invalidateQueries()
      toast.success(
        selectedTransactions.length === 1
          ? 'Categoria aplicada'
          : `Categoria aplicada em ${selectedTransactions.length} lançamentos`
      )
      setSelected(new Set())
    } catch {
      toast.error('Erro ao aplicar categoria')
    }
  }

  const confirmBulkDelete = async () => {
    if (!slug || deletableSelected.length === 0) return

    try {
      await Promise.all(
        deletableSelected.map(item => deleteTransaction({ slug, id: item.id }))
      )
      await invalidateQueries()
      toast.success(
        deletableSelected.length === 1
          ? 'Lançamento excluído'
          : `${deletableSelected.length} lançamentos excluídos`
      )
      setSelected(new Set())
      setBulkDeleteOpen(false)
    } catch {
      toast.error('Erro ao excluir lançamentos')
    }
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableItems.map(item => item.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tableHeader = (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-10">
          {selectableItems.length > 0 ? (
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" />
          ) : null}
        </TableHead>
        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {isCreditCardStatement ? 'Compra' : 'Data'}
        </TableHead>
        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Descrição
        </TableHead>
        <TableHead className="hidden text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">
          Categoria
        </TableHead>
        {!accountId && (
          <TableHead className="hidden text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">
            Conta
          </TableHead>
        )}
        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
          Valor
        </TableHead>
        {showStatusColumn && (
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </TableHead>
        )}
        {showActionsColumn && (
          <TableHead className="w-12 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ações
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  )

  const listWrapperClass = cn(containerClassName ?? 'mx-4 lg:mx-6')
  const tableContainerClass = cn(
    'overflow-hidden rounded-lg border border-slate-200/80 bg-white',
    containerClassName?.includes('overflow-x-auto') ? 'overflow-x-auto' : undefined
  )

  if (!items.length) {
    return (
      <div className={listWrapperClass}>
        <div className={tableContainerClass}>
          <Table>
            {tableHeader}
            <TableBody>
              {allowInlineCreate && (
                <TransactionInlineCreateBar
                  accountId={accountId}
                  showStatusColumn={showStatusColumn}
                  showActionsColumn={showActionsColumn}
                />
              )}
            </TableBody>
          </Table>
          <div className="border-t border-slate-100 px-4 py-12 text-center text-slate-500">
            Nenhuma transação encontrada.
          </div>
        </div>
      </div>
    )
  }

  const bulkActionsBar =
    selectedTransactions.length > 0 ? (
      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2.5">
        <p className="mr-auto text-sm font-medium text-violet-900">
          {selectedTransactions.length === 1
            ? '1 lançamento selecionado'
            : `${selectedTransactions.length} lançamentos selecionados`}
        </p>
        <div className="min-w-[160px] flex-1 space-y-1 sm:max-w-xs">
          <Label className="text-xs text-slate-600">Aplicar categoria</Label>
          <CategorySelect
            value={bulkCategoryId || undefined}
            type={bulkCategoryType ?? 'expense'}
            onChange={setBulkCategoryId}
            enabled={bulkCategoryType != null}
            placeholder={
              bulkCategoryType ? 'Selecione' : 'Tipos mistos'
            }
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-violet-200 bg-white"
          disabled={isUpdatingCategory || bulkCategoryType == null}
          onClick={applyBulkCategory}
        >
          {isUpdatingCategory ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Aplicando...
            </>
          ) : (
            'Aplicar categoria'
          )}
        </Button>
        {deletableSelected.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Excluir ({deletableSelected.length})
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-600"
          onClick={() => setSelected(new Set())}
        >
          <X className="mr-1.5 size-3.5" />
          Limpar
        </Button>
      </div>
    ) : null

  return (
    <>
      <div className={listWrapperClass}>
        {bulkActionsBar}
        <div className={tableContainerClass}>
        <Table>
          {tableHeader}
          <TableBody>
            {allowInlineCreate && (
              <TransactionInlineCreateBar
                accountId={accountId}
                showStatusColumn={showStatusColumn}
                showActionsColumn={showActionsColumn}
              />
            )}
            {items.map(item => {
            if (isInvoiceSummary(item)) {
              const overdue =
                mode === 'overdue' &&
                item.status === 'pending' &&
                dayjs(item.date).isBefore(dayjs().startOf('day'))

              const openInvoice = () =>
                navigate({
                  to: '/$org/accounts',
                  params: { org: slug },
                  search: {
                    kind: 'cards' as const,
                    accountId: item.accountId,
                    month: item.monthKey,
                    ...(item.overdueKind === 'receivable' || item.overdueKind === 'both'
                      ? { invoiceFilter: 'divided' as const }
                      : {}),
                  },
                })

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    'cursor-pointer bg-violet-50/50 hover:bg-violet-50',
                    overdue && 'bg-amber-50/60 hover:bg-amber-50'
                  )}
                  onClick={openInvoice}
                >
                  <TableCell />
                  <TableCell className="whitespace-nowrap text-sm text-slate-600">
                    {formatIsoDateLabel(item.date)}
                  </TableCell>
                  <TableCell>
                    <span className="max-w-[200px] truncate font-medium text-violet-900 lg:max-w-xs">
                      {item.title}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-violet-700">
                      <CreditCard className="size-3.5 shrink-0" />
                      <span className="truncate">Fatura de cartão</span>
                    </div>
                  </TableCell>
                  {!accountId && (
                    <TableCell className="hidden text-sm text-slate-600 sm:table-cell">
                      {item.accountName}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <span className="font-semibold tabular-nums text-rose-600">
                      - {formatCentsString(
                        item.status === 'paid' ? item.amount : (item.remaining ?? item.amount)
                      )}
                    </span>
                  </TableCell>
                  {showStatusColumn && (
                    <TableCell>
                      <Badge
                        variant={getStatusVariant(item)}
                        className={cn(
                          item.status === 'paid' &&
                            'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
                          item.status === 'pending' &&
                            item.overdueKind !== 'receivable' &&
                            'border-violet-200 bg-white text-violet-800',
                          item.overdueKind === 'receivable' &&
                            'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50'
                        )}
                      >
                        {getStatusLabel(item)}
                      </Badge>
                    </TableCell>
                  )}
                  {showActionsColumn && <TableCell />}
                </TableRow>
              )
            }

            const tx = item
            const overdue = mode === 'overdue' && isOverdue(tx)
            const payableListDate = !isCreditCardStatement ? getPayableListDate(tx) : null
            const creditCardExpense = isCreditCardExpense(tx, accounts?.accounts)
            const showRecurringContractButton = tx.recurringTransactionId != null
            const showPayButton =
              showPayActionColumn && tx.status === 'pending' && !creditCardExpense
            const showDeleteButton = showDeleteActionColumn && canDeleteTransaction(tx)
            const showDetailsButton =
              isCreditCardStatement || (!showPayButton && !showDeleteButton)
            const openTransactionDetails = () =>
              openDrawer(
                {
                  categoryIds: tx.categoryIds,
                  accountId: tx.accountId ?? undefined,
                  cardId: tx.cardId ?? undefined,
                },
                tx.id,
                accountId ? { lockAccountId: accountId } : undefined
              )
            return (
            <TableRow
              key={tx.id}
              data-state={selected.has(tx.id) ? 'selected' : undefined}
              className={cn(
                'cursor-pointer',
                overdue && 'bg-amber-50/60 hover:bg-amber-50'
              )}
              onClick={openTransactionDetails}
            >
              <TableCell onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={selected.has(tx.id)}
                  onCheckedChange={() => toggleOne(tx.id)}
                  aria-label={`Selecionar ${tx.title}`}
                />
              </TableCell>
              <TableCell
                className={cn(
                  'whitespace-nowrap text-sm',
                  overdue ? 'font-medium text-rose-600' : 'text-slate-600'
                )}
              >
                {formatIsoDateLabel(
                  isCreditCardStatement
                    ? transactionPurchaseDate(tx)
                    : (payableListDate?.displayDay ?? tx.date)
                )}
              </TableCell>
              <TableCell>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="max-w-[200px] truncate font-medium text-slate-900 lg:max-w-xs">
                      {tx.title}
                    </span>
                    {(() => {
                      const hasSplit =
                        fullyDelegatedById?.has(tx.id) || partiallyDividedById?.has(tx.id)
                      const settlement = resolveTransactionSplitBadgeSettlement({
                        transactionId: tx.id,
                        hasSplit: Boolean(hasSplit),
                        splitRemainingById,
                        viewerShareRemaining: viewerShareById?.get(tx.id)?.remainingAmount,
                      })
                      const delegated = fullyDelegatedById?.get(tx.id)
                      if (delegated) {
                        const perspective = resolveSplitBadgePerspective(
                          delegated.debtorUserId,
                          currentUserId
                        )
                        return (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'shrink-0 text-[10px] font-medium',
                              splitBadgeClassName(settlement)
                            )}
                          >
                            {formatDelegatedSplitBadge(
                              delegated.delegateName,
                              settlement,
                              perspective,
                              delegated.creditorName
                            )}
                          </Badge>
                        )
                      }
                      const partialInfo = partiallyDividedById?.get(tx.id)
                      if (partialInfo) {
                        const perspective = resolveSplitBadgePerspective(
                          partialInfo.debtorUserId,
                          currentUserId
                        )
                        return (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'shrink-0 text-[10px] font-medium',
                              partialSplitBadgeClassName(settlement)
                            )}
                          >
                            {formatPartialSplitBadge(partialInfo, settlement, perspective)}
                          </Badge>
                        )
                      }
                      if (tx.recurringTransactionId) {
                        return (
                          <Badge
                            variant="secondary"
                            className="shrink-0 border-violet-200 bg-violet-50 text-[10px] font-medium text-violet-800"
                          >
                            Recorrente
                          </Badge>
                        )
                      }
                      return null
                    })()}
                  </div>
                  {tx.installmentsTotal != null && tx.installmentsTotal > 1 && (
                    <p className="text-xs text-slate-500">
                      Parcela {tx.installmentNumber ?? '?'}/{tx.installmentsTotal}
                    </p>
                  )}
                  {payableListDate?.dueSubtext && (
                    <p className="text-xs text-slate-500">{payableListDate.dueSubtext}</p>
                  )}
                  {showCardLabel && tx.type === 'expense' && (
                    <p className="text-xs text-slate-500">
                      {cardLabel(tx.cardId) ?? 'Sem cartão'}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Tag className="size-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{categoryLabel(tx.categoryIds) ?? '—'}</span>
                </div>
              </TableCell>
              {!accountId && (
                <TableCell className="hidden text-sm text-slate-600 sm:table-cell">
                  {accountName(tx.accountId)}
                </TableCell>
              )}
              <TableCell className="text-right">
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  )}
                >
                  {tx.type === 'income' ? '+ ' : '- '}
                  {formatCentsString(
                    tx.status === 'paid'
                      ? tx.amount
                      : reaisToMoneyString(
                          // Purchase/bank remaining only — split reimbursements use badges
                          // (A receber / Recebido), not a reduced list amount.
                          resolveTransactionListAmountReais(tx.amount, tx.paidAmount)
                        )
                  )}
                </span>
              </TableCell>
              {showStatusColumn && (
                <TableCell>
                  {creditCardExpense ? (
                    <span className="text-sm text-slate-400">—</span>
                  ) : tx.status === 'pending' || tx.status === 'partial' ? (
                    <div className="flex flex-wrap gap-1">
                      {getPayableStatusBadges(tx, {
                        isPartiallyPaid: isTransactionPartiallyPaid(
                          tx.amount,
                          tx.paidAmount,
                          splitPaidById?.get(tx.id) ?? 0
                        ),
                        settlementKind: tx.type === 'income' ? 'income' : 'expense',
                      }).map(badge => (
                        <Badge
                          key={badge.key}
                          variant="outline"
                          className={cn('text-xs', badge.className)}
                        >
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Badge
                      variant={getStatusVariant(tx)}
                      className={cn(
                        tx.status === 'paid' &&
                          'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
                        tx.status === 'pending' && 'border-slate-200 bg-white text-slate-700'
                      )}
                    >
                      {getStatusLabel(tx)}
                    </Badge>
                  )}
                </TableCell>
              )}
              {showActionsColumn && (
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                    {showRecurringContractButton && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-slate-500 hover:text-violet-600"
                        onClick={() => {
                          const recurringId = tx.recurringTransactionId
                          if (recurringId) openRecurringContractDrawer(recurringId)
                        }}
                        aria-label="Editar contrato recorrente"
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    )}
                    {showPayButton && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-slate-500 hover:text-emerald-600"
                        onClick={() => openPayDrawer(tx.id)}
                        aria-label={
                          tx.type === 'income' ? 'Confirmar recebimento' : 'Confirmar pagamento'
                        }
                      >
                        <Check className="size-4" />
                      </Button>
                    )}
                    {showDeleteButton && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-slate-500 hover:text-red-600"
                        onClick={() => setDeleteTarget(tx)}
                        aria-label="Excluir lançamento"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                    {showDetailsButton && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-slate-500 hover:text-violet-600"
                        onClick={openTransactionDetails}
                        aria-label="Ver detalhes"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
        </div>
      </div>
      <DeleteTransactionDialog
        transaction={
          deleteTarget
            ? {
                id: deleteTarget.id,
                title: deleteTarget.title,
                amount: deleteTarget.amount,
                transferPairId: deleteTarget.transferPairId,
              }
            : null
        }
        open={deleteTarget != null}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null)
        }}
      />
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="size-5 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl">Excluir lançamentos</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <p className="text-sm text-foreground">
            Excluir{' '}
            <span className="font-semibold">
              {deletableSelected.length === 1
                ? '1 lançamento selecionado'
                : `${deletableSelected.length} lançamentos selecionados`}
            </span>
            ?
          </p>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto" disabled={isDeletingBulk}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async event => {
                event.preventDefault()
                await confirmBulkDelete()
              }}
              className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-600 sm:w-auto"
              disabled={isDeletingBulk}
            >
              {isDeletingBulk ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function TransactionList({
  items,
  showPayAction = true,
  variant = 'default',
  mode = 'default',
  accountId,
  cards,
  fullyDelegatedById: fullyDelegatedByIdProp,
  partiallyDividedById: partiallyDividedByIdProp,
  splitRemainingById: splitRemainingByIdProp,
  viewerShareById: viewerShareByIdProp,
  allowInlineCreate = true,
  containerClassName,
}: TransactionListProps) {
  const { slug } = useActiveOrganization()
  const search = useSearch({ strict: false }) as {
    recurring?: 'all' | 'recurring' | 'single'
    scheduled?: 'scheduled' | 'unscheduled'
  }

  const filtered = useMemo(() => {
    let result = items

    if (search.recurring && search.recurring !== 'all') {
      result = result.filter(item => {
        if (isInvoiceSummary(item)) return true
        if (search.recurring === 'recurring') {
          return item.recurringTransactionId != null
        }
        return item.recurringTransactionId == null
      })
    }

    if (search.scheduled === 'scheduled') {
      result = result.filter(item => {
        if (isInvoiceSummary(item)) return false
        return isFutureScheduled(item)
      })
    } else if (search.scheduled === 'unscheduled') {
      result = result.filter(item => {
        if (isInvoiceSummary(item)) return true
        return !isFutureScheduled(item)
      })
    }

    return result
  }, [items, search.recurring, search.scheduled])

  const listItems = mode === 'overdue' ? items : filtered
  const transactionIds = useMemo(
    () =>
      listItems
        .filter((item): item is TransactionRow => !isInvoiceSummary(item))
        .map(item => item.id),
    [listItems]
  )
  const { data: splitData } = useSplitTransactionIds(slug, transactionIds)
  const fullyDelegatedById = fullyDelegatedByIdProp ?? splitData?.fullyDelegatedById
  const partiallyDividedById = partiallyDividedByIdProp ?? splitData?.partiallyDividedById
  const splitPaidById = splitData?.splitPaidById
  const splitRemainingById = splitRemainingByIdProp ?? splitData?.splitRemainingById
  const viewerShareById = viewerShareByIdProp ?? splitData?.viewerShareById

  return (
    <TransactionTable
      items={listItems}
      showPayAction={showPayAction}
      variant={variant}
      mode={mode}
      accountId={accountId}
      cards={cards}
      fullyDelegatedById={fullyDelegatedById}
      partiallyDividedById={partiallyDividedById}
      splitPaidById={splitPaidById}
      splitRemainingById={splitRemainingById}
      viewerShareById={viewerShareById}
      allowInlineCreate={allowInlineCreate}
      containerClassName={containerClassName}
    />
  )
}
