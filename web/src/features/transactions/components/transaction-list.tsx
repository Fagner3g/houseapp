import dayjs from 'dayjs'
import { Check, CreditCard, Tag, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { useListAccounts, useListCategories } from '@/api/generated/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCentsString } from '@/lib/currency'
import { transactionPurchaseDate } from '@/lib/credit-card-invoice-metrics'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'
import { cn } from '@/lib/utils'
import { isInvoiceSummary, type TransactionListItem } from '@/features/transactions/types'
import { TransactionInlineCreateBar } from './transaction-inline-create-bar'
import { DeleteTransactionDialog } from './delete-transaction-dialog'
import { canDeleteTransaction } from '@/features/transactions/utils/can-delete-transaction'

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
}

function isCreditCardExpense(
  tx: Extract<TransactionListItem, { kind: 'transaction' }>,
  accounts: { id: string; type: string }[] | undefined
) {
  const account = accounts?.find(a => a.id === tx.accountId)
  return account?.type === 'credit_card' && tx.type === 'expense'
}

function isOverdue(tx: Extract<TransactionListItem, { kind: 'transaction' }>) {
  return tx.status === 'pending' && dayjs(tx.date).isBefore(dayjs().startOf('day'))
}

function getStatusLabel(item: TransactionListItem): string {
  if (isInvoiceSummary(item)) {
    if (item.status === 'paid') return 'Paga'
    const remaining = Number(item.remaining ?? item.amount)
    const payments = Number(item.payments ?? 0)
    if (payments > 0 && remaining > 0) return 'Parcial'
    return 'Em aberto'
  }
  const tx = item
  if (tx.status === 'canceled') return 'Cancelado'
  if (tx.status === 'paid') return tx.type === 'income' ? 'Recebido' : 'Pago'
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
}: TransactionListProps) {
  const isCreditCardStatement = variant === 'credit_card_statement'
  const showCardLabel = isCreditCardStatement && !!cards?.length
  const showStatusColumn = !isCreditCardStatement
  const showPayActionColumn = !isCreditCardStatement && showPayAction
  const showDeleteActionColumn = isCreditCardStatement
  const showActionsColumn = showPayActionColumn || showDeleteActionColumn
  const { slug } = useActiveOrganization()
  const navigate = useNavigate()
  const { data: accounts } = useListAccounts(slug, { query: { enabled: !!slug } })
  const { data: categories } = useListCategories(slug, { query: { enabled: !!slug } })
  const openDrawer = useDrawerStore(s => s.openTransactionDrawer)
  const openPayDrawer = useDrawerStore(s => s.openTransactionPayDrawer)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Extract<TransactionListItem, { kind: 'transaction' }> | null>(null)

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

  const allSelected = items.length > 0 && selected.size === items.length

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map(t => t.id)))
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
          {items.length > 0 ? (
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

  if (!items.length) {
    return (
      <div className="mx-4 overflow-hidden rounded-lg border border-slate-200/80 bg-white lg:mx-6">
        <Table>
          {tableHeader}
          <TableBody>
            <TransactionInlineCreateBar
              accountId={accountId}
              showStatusColumn={showStatusColumn}
              showActionsColumn={showActionsColumn}
            />
          </TableBody>
        </Table>
        <div className="border-t border-slate-100 px-4 py-12 text-center text-slate-500">
          Nenhuma transação encontrada.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-4 overflow-hidden rounded-lg border border-slate-200/80 bg-white lg:mx-6">
        <Table>
          {tableHeader}
          <TableBody>
            <TransactionInlineCreateBar
              accountId={accountId}
              showStatusColumn={showStatusColumn}
              showActionsColumn={showActionsColumn}
            />
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
                  search: { accountId: item.accountId, month: item.monthKey },
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
                    {dayjs(item.date).format('DD/MM/YYYY')}
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
                            'border-violet-200 bg-white text-violet-800'
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
            const creditCardExpense = isCreditCardExpense(tx, accounts?.accounts)
            return (
            <TableRow
              key={tx.id}
              data-state={selected.has(tx.id) ? 'selected' : undefined}
              className={cn(
                'cursor-pointer',
                overdue && 'bg-amber-50/60 hover:bg-amber-50'
              )}
              onClick={() =>
                openDrawer(
                  {
                    categoryIds: tx.categoryIds,
                    accountId: tx.accountId ?? undefined,
                    cardId: tx.cardId ?? undefined,
                  },
                  tx.id,
                  accountId ? { lockAccountId: accountId } : undefined
                )
              }
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
                {dayjs(
                  isCreditCardStatement ? transactionPurchaseDate(tx) : tx.date
                ).format('DD/MM/YYYY')}
              </TableCell>
              <TableCell>
                <div>
                  <span className="max-w-[200px] truncate font-medium text-slate-900 lg:max-w-xs">
                    {tx.title}
                  </span>
                  {tx.installmentsTotal != null && tx.installmentsTotal > 1 && (
                    <p className="text-xs text-slate-500">
                      Parcela {tx.installmentNumber ?? '?'}/{tx.installmentsTotal}
                    </p>
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
                  {formatCentsString(tx.amount)}
                </span>
              </TableCell>
              {showStatusColumn && (
                <TableCell>
                  {creditCardExpense ? (
                    <span className="text-sm text-slate-400">—</span>
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
                  {showPayActionColumn && tx.status === 'pending' && !creditCardExpense && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-slate-500 hover:text-emerald-600"
                      onClick={() => openPayDrawer(tx.id)}
                      aria-label="Confirmar pagamento"
                    >
                      <Check className="size-4" />
                    </Button>
                  )}
                  {showDeleteActionColumn && canDeleteTransaction(tx) && (
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
                </TableCell>
              )}
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
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
}: TransactionListProps) {
  const search = useSearch({ strict: false }) as {
    recurring?: 'all' | 'recurring' | 'single'
  }

  const filtered = useMemo(() => {
    if (!search.recurring || search.recurring === 'all') return items
    return items.filter(item => {
      if (isInvoiceSummary(item)) return true
      if (search.recurring === 'recurring') {
        return item.recurringTransactionId != null
      }
      return item.recurringTransactionId == null
    })
  }, [items, search.recurring])

  if (mode === 'overdue') {
    return (
      <TransactionTable
        items={items}
        showPayAction={showPayAction}
        variant={variant}
        mode="overdue"
        accountId={accountId}
        cards={cards}
      />
    )
  }

  return (
    <TransactionTable
      items={filtered}
      showPayAction={showPayAction}
      variant={variant}
      mode="default"
      accountId={accountId}
      cards={cards}
    />
  )
}
