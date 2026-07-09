import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { ChevronDown, ChevronRight, Loader2, Split, Tag, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  getListAccountsQueryKey,
  getListTransactionsQueryKey,
  useListCategories,
  useUpdateTransaction,
} from '@/api/generated/api'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { CategorySelect } from '@/features/categories/components/category-select'
import {
  formatDelegatedSplitBadge,
  formatPartialSplitBadge,
  type PartialSplitBadgeInfo,
} from '@/features/transactions/lib/split-badge-label'
import { formatCentsString } from '@/lib/currency'
import { transactionPurchaseDate } from '@/lib/credit-card-invoice-metrics'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'
import { cn } from '@/lib/utils'
import { isCardStatementCreditTitle } from '@houseapp/finance-core'

import {
  aggregateStatementMerchants,
  formatStatementMerchantSubtitle,
  getStatementGroupSignedAmount,
  resolveStatementGroupCategoryId,
  statementGroupStatusLabel,
  type StatementMerchantGroup,
} from '../lib/aggregate-statement-merchants'

type CreditCardStatementGroupsProps = {
  transactions: ListTransactions200TransactionsItem[]
  accountId: string
  cards?: Array<{ id: string; label: string; lastFourDigits?: string | null }>
  fullyDelegatedById?: Map<string, string>
  partiallyDividedById?: Map<string, PartialSplitBadgeInfo>
  dividedTransactionIds?: Set<string>
}

function getCategorizableGroupTransactions(
  group: StatementMerchantGroup,
  transactions: ListTransactions200TransactionsItem[]
) {
  return transactions.filter(
    transaction =>
      group.transactionIds.includes(transaction.id) &&
      transaction.type === 'expense' &&
      !isCardStatementCreditTitle(transaction.title)
  )
}

function StatementCompactRow({
  transaction,
  hideCategory,
  showCardLabel,
  categoryLabel,
  cardLabel,
  fullyDelegatedById,
  partiallyDividedById,
  onOpen,
}: {
  transaction: ListTransactions200TransactionsItem
  hideCategory: boolean
  showCardLabel: boolean
  categoryLabel: (categoryIds?: string[] | null) => string | null
  cardLabel: (cardId?: string | null) => string | null
  fullyDelegatedById?: Map<string, string>
  partiallyDividedById?: Map<string, PartialSplitBadgeInfo>
  onOpen: () => void
}) {
  const hasSplit =
    fullyDelegatedById?.has(transaction.id) || partiallyDividedById?.has(transaction.id)

  return (
    // biome-ignore lint/a11y/useSemanticElements: nested split control must remain a button
    <div
      role="button"
      tabIndex={0}
      className="flex cursor-pointer items-center gap-3 border-t border-slate-100/80 px-3 py-2 first:border-t-0 hover:bg-white/80"
      onClick={onOpen}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <span className="inline-block size-4 shrink-0" />

      <span className="w-14 shrink-0 text-xs tabular-nums text-slate-600">
        {dayjs(transactionPurchaseDate(transaction)).format('DD/MM/YY')}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium text-slate-800">{transaction.title}</p>
          {(() => {
            const delegatedName = fullyDelegatedById?.get(transaction.id)
            if (delegatedName) {
              return (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 border-amber-200 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-800"
                >
                  {formatDelegatedSplitBadge(delegatedName)}
                </Badge>
              )
            }
            const partialInfo = partiallyDividedById?.get(transaction.id)
            if (partialInfo) {
              return (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 border-sky-200 bg-sky-50 px-1.5 text-[10px] font-medium text-sky-800"
                >
                  {formatPartialSplitBadge(partialInfo)}
                </Badge>
              )
            }
            return null
          })()}
        </div>
        {transaction.installmentsTotal != null && transaction.installmentsTotal > 1 ? (
          <p className="text-xs text-slate-500">
            Parcela {transaction.installmentNumber ?? '?'}/{transaction.installmentsTotal}
          </p>
        ) : showCardLabel && transaction.type === 'expense' ? (
          <p className="text-xs text-slate-500">{cardLabel(transaction.cardId) ?? 'Sem cartão'}</p>
        ) : null}
      </div>

      {!hideCategory ? (
        <div className="hidden w-36 shrink-0 items-center gap-1.5 text-sm text-slate-600 md:flex">
          <Tag className="size-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{categoryLabel(transaction.categoryIds) ?? '—'}</span>
        </div>
      ) : null}

      {transaction.type === 'expense' ? (
        <button
          type="button"
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
            hasSplit
              ? 'border-violet-200 bg-violet-50 text-violet-700'
              : 'border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-600'
          )}
          title={hasSplit ? 'Editar divisão' : 'Dividir compra'}
          onClick={event => {
            event.stopPropagation()
            onOpen()
          }}
        >
          <Split className="size-3.5" />
        </button>
      ) : (
        <span className="inline-block size-8 shrink-0" />
      )}

      <span
        className={cn(
          'w-24 shrink-0 text-right text-sm font-semibold tabular-nums',
          transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
        )}
      >
        {transaction.type === 'income' ? '+ ' : '- '}
        {formatCentsString(transaction.amount)}
      </span>
    </div>
  )
}

function StatementMerchantGroupCard({
  group,
  transactions,
  cards,
  fullyDelegatedById,
  partiallyDividedById,
  expanded,
  selectedIds,
  isUpdatingCategory,
  onToggleExpand,
  onToggleSelectGroup,
  onApplyGroupCategory,
  categoryLabel,
  cardLabel,
  onOpenTransaction,
}: {
  group: StatementMerchantGroup
  transactions: ListTransactions200TransactionsItem[]
  cards?: Array<{ id: string; label: string; lastFourDigits?: string | null }>
  fullyDelegatedById?: Map<string, string>
  partiallyDividedById?: Map<string, PartialSplitBadgeInfo>
  expanded: boolean
  selectedIds: Set<string>
  isUpdatingCategory: boolean
  onToggleExpand: () => void
  onToggleSelectGroup: (checked: boolean) => void
  onApplyGroupCategory: (categoryId: string | null) => void
  categoryLabel: (categoryIds?: string[] | null) => string | null
  cardLabel: (cardId?: string | null) => string | null
  onOpenTransaction: (transaction: ListTransactions200TransactionsItem) => void
}) {
  const groupTransactions = transactions
    .filter(transaction => group.transactionIds.includes(transaction.id))
    .sort((left, right) => dayjs(right.date).valueOf() - dayjs(left.date).valueOf())
  const signedTotal = getStatementGroupSignedAmount(transactions, group)
  const showCardLabel = !!cards?.length
  const categorizableTransactions = getCategorizableGroupTransactions(group, transactions)
  const showGroupCategory = group.uniformType === 'expense' && categorizableTransactions.length > 0
  const groupCategoryId = resolveStatementGroupCategoryId(group, transactions)
  const statusLabel = statementGroupStatusLabel(group)
  const allSelected =
    groupTransactions.length > 0 && groupTransactions.every(transaction => selectedIds.has(transaction.id))
  const someSelected =
    groupTransactions.some(transaction => selectedIds.has(transaction.id)) && !allSelected

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border transition-colors',
        expanded ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Checkbox
          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
          onCheckedChange={checked => onToggleSelectGroup(checked === true)}
        />

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={onToggleExpand}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-medium text-slate-900">{group.label}</span>
              {group.uniformType === 'income' ? (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700"
                >
                  Receita
                </Badge>
              ) : null}
              {group.isRecurring ? (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 border-violet-200 bg-violet-50 px-1.5 text-[10px] font-medium text-violet-700"
                >
                  Recorrente
                </Badge>
              ) : null}
              {group.hasInstallments ? (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium text-slate-600"
                >
                  Parcelada
                </Badge>
              ) : null}
              {group.dividedCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 border-sky-200 bg-sky-50 px-1.5 text-[10px] font-medium text-sky-700"
                >
                  {group.dividedCount === 1 ? 'Dividida' : `${group.dividedCount} divididas`}
                </Badge>
              ) : null}
              {statusLabel ? (
                <Badge
                  variant="outline"
                  className="h-5 shrink-0 border-amber-200 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700"
                >
                  {statusLabel}
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-slate-500">{formatStatementMerchantSubtitle(group)}</p>
          </div>
        </button>

        {showGroupCategory ? (
          <div className="hidden w-40 shrink-0 sm:block">
            <CategorySelect
              value={groupCategoryId}
              type="expense"
              className="h-8 w-full min-w-0"
              enabled={!isUpdatingCategory}
              onChange={onApplyGroupCategory}
            />
          </div>
        ) : null}

        <span className="inline-block size-8 shrink-0 sm:hidden" />

        <p
          className={cn(
            'w-24 shrink-0 text-right text-sm font-semibold tabular-nums',
            signedTotal.className
          )}
        >
          {signedTotal.label}
        </p>
      </div>

      {showGroupCategory ? (
        <div className="border-t border-slate-100 px-3 py-2 sm:hidden">
          <CategorySelect
            value={groupCategoryId}
            type="expense"
            className="h-8 w-full min-w-0"
            enabled={!isUpdatingCategory}
            onChange={onApplyGroupCategory}
          />
        </div>
      ) : null}

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/60">
          {groupTransactions.map(transaction => (
            <StatementCompactRow
              key={transaction.id}
              transaction={transaction}
              hideCategory={showGroupCategory}
              showCardLabel={showCardLabel}
              categoryLabel={categoryLabel}
              cardLabel={cardLabel}
              fullyDelegatedById={fullyDelegatedById}
              partiallyDividedById={partiallyDividedById}
              onOpen={() => onOpenTransaction(transaction)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CreditCardStatementGroups({
  transactions,
  accountId,
  cards,
  fullyDelegatedById,
  partiallyDividedById,
  dividedTransactionIds = new Set(),
}: CreditCardStatementGroupsProps) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const openDrawer = useDrawerStore(state => state.openTransactionDrawer)
  const { mutateAsync: updateTransaction, isPending: isUpdatingCategory } = useUpdateTransaction()
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')

  const { data: categoriesData } = useListCategories(slug, { query: { enabled: !!slug } })

  const groups = useMemo(
    () => aggregateStatementMerchants(transactions, dividedTransactionIds),
    [transactions, dividedTransactionIds]
  )

  const selectedTransactions = useMemo(
    () => transactions.filter(transaction => selectedIds.has(transaction.id)),
    [transactions, selectedIds]
  )

  const bulkCategoryType = useMemo(() => {
    const types = new Set(selectedTransactions.map(transaction => transaction.type))
    if (types.size !== 1) return null
    const [type] = types
    return type === 'income' || type === 'expense' ? type : null
  }, [selectedTransactions])

  const categoryLabel = (categoryIds?: string[] | null) => {
    const id = categoryIds?.[0]
    if (!id) return null
    return categoriesData?.categories?.find(category => category.id === id)?.name ?? null
  }

  const cardLabel = (cardId?: string | null) => {
    if (!cardId) return null
    const card = cards?.find(item => item.id === cardId)
    if (!card) return null
    return card.lastFourDigits ? `${card.label} · ${card.lastFourDigits}` : card.label
  }

  const invalidateTransactionQueries = async () => {
    if (!slug) return
    await queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(slug) })
    await queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) })
  }

  const applyCategoryToTransactions = async (
    targets: ListTransactions200TransactionsItem[],
    categoryId: string | null
  ) => {
    if (!slug || targets.length === 0 || !categoryId) return

    try {
      await Promise.all(
        targets.map(transaction =>
          updateTransaction({
            slug,
            id: transaction.id,
            data: { categoryIds: [categoryId] },
          })
        )
      )
      await invalidateTransactionQueries()
      toast.success(
        targets.length === 1
          ? 'Categoria aplicada'
          : `Categoria aplicada em ${targets.length} lançamentos`
      )
    } catch {
      toast.error('Erro ao aplicar categoria')
    }
  }

  const applyBulkCategory = async () => {
    if (!bulkCategoryId) {
      toast.error('Selecione uma categoria')
      return
    }
    if (!bulkCategoryType) {
      toast.error('Selecione lançamentos do mesmo tipo (despesa ou receita)')
      return
    }

    await applyCategoryToTransactions(selectedTransactions, bulkCategoryId)
    setSelectedIds(new Set())
    setBulkCategoryId('')
  }

  const toggleExpand = (key: string) => {
    setExpandedGroupKeys(current => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectGroup = (group: StatementMerchantGroup, checked: boolean) => {
    setSelectedIds(current => {
      const next = new Set(current)
      for (const id of group.transactionIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const openTransaction = (transaction: ListTransactions200TransactionsItem) => {
    openDrawer(
      {
        categoryIds: transaction.categoryIds,
        accountId: transaction.accountId ?? accountId,
        cardId: transaction.cardId ?? undefined,
      },
      transaction.id,
      { lockAccountId: accountId }
    )
  }

  if (groups.length === 0) {
    return (
      <div className="mx-4 rounded-lg border border-slate-200/80 bg-white px-4 py-12 text-center text-slate-500 lg:mx-6">
        Nenhuma transação encontrada.
      </div>
    )
  }

  return (
    <div className="mx-4 lg:mx-6">
      {selectedTransactions.length > 0 ? (
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
              enabled={bulkCategoryType != null}
              placeholder={bulkCategoryType ? 'Selecione' : 'Tipos mistos'}
              onChange={id => setBulkCategoryId(id ?? '')}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-600"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="mr-1.5 size-3.5" />
            Limpar
          </Button>
        </div>
      ) : null}

      <div className="space-y-2 rounded-lg border border-slate-200/80 bg-white p-2">
        {groups.map(group => (
          <StatementMerchantGroupCard
            key={group.key}
            group={group}
            transactions={transactions}
            cards={cards}
            fullyDelegatedById={fullyDelegatedById}
            partiallyDividedById={partiallyDividedById}
            expanded={expandedGroupKeys.has(group.key)}
            selectedIds={selectedIds}
            isUpdatingCategory={isUpdatingCategory}
            onToggleExpand={() => toggleExpand(group.key)}
            onToggleSelectGroup={checked => toggleSelectGroup(group, checked)}
            onApplyGroupCategory={categoryId =>
              applyCategoryToTransactions(
                getCategorizableGroupTransactions(group, transactions),
                categoryId
              )
            }
            categoryLabel={categoryLabel}
            cardLabel={cardLabel}
            onOpenTransaction={openTransaction}
          />
        ))}
      </div>
    </div>
  )
}
