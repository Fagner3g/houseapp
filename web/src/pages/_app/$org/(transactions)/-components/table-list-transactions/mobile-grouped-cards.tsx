import { ChevronDown, Users } from 'lucide-react'
import { useState } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'
import { MobileCards } from './mobile-cards'

interface Props {
  transactions: ListTransactions200TransactionsItem[]
  onTransactionClick: (transaction: ListTransactions200TransactionsItem) => void
  onRowSelect?: (id: string, selected: boolean) => void
  selectedRows?: string[]
  onEdit?: (transaction: ListTransactions200TransactionsItem) => void
  onDuplicate?: (transaction: ListTransactions200TransactionsItem) => void
  onPay?: (id: string) => void
  onDelete?: (id: string) => void
}

export function MobileGroupedCards({
  transactions,
  onTransactionClick,
  onRowSelect,
  selectedRows = [],
  onEdit,
  onDuplicate,
  onPay,
  onDelete,
}: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const currentUser = useAuthStore(s => s.user)

  // Verificação de segurança
  if (!transactions || !Array.isArray(transactions)) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">Carregando transações...</h3>
        <p className="text-sm text-muted-foreground">Aguarde enquanto carregamos os dados.</p>
      </div>
    )
  }

  // Agrupar transações por contraparte (quem está do outro lado da transação)
  const groupedTransactions = transactions.reduce(
    (acc, transaction) => {
      const isCurrentUserOwner = transaction.ownerId === currentUser?.id
      const isCurrentUserPayTo =
        transaction.payTo.email === currentUser?.email || transaction.payToId === currentUser?.id

      // Determinar o nome do grupo baseado na pessoa referenciada
      // Sempre agrupar pelo nome da pessoa que está sendo referenciada na transação
      let groupName = ''
      let groupEmail = ''

      if (isCurrentUserOwner) {
        // Usuário é owner, agrupar pelo payTo (quem deve pagar)
        groupName = transaction.payTo.name
        groupEmail = transaction.payTo.email
      } else if (isCurrentUserPayTo) {
        // Usuário é payTo, agrupar pelo payTo (quem deve pagar - que é o próprio usuário)
        // Mas mostrar o nome do owner (quem criou) para contexto
        groupName = transaction.ownerName
        groupEmail = transaction.ownerId
      } else {
        // Usuário não está envolvido, agrupar por payTo
        groupName = transaction.payTo.name
        groupEmail = transaction.payTo.email
      }

      // Criar chave única para o grupo baseada apenas no nome (ignorar email)
      const groupKey = groupName

      if (!acc[groupKey]) {
        acc[groupKey] = {
          payTo: { name: groupName, email: groupEmail },
          transactions: [],
        }
      }

      acc[groupKey].transactions.push(transaction)

      return acc
    },
    {} as Record<
      string,
      {
        payTo: { name: string; email: string }
        transactions: ListTransactions200TransactionsItem[]
      }
    >
  )

  const toggleGroup = (groupKey: string) => {
    const newOpenGroups = new Set(openGroups)
    if (newOpenGroups.has(groupKey)) {
      newOpenGroups.delete(groupKey)
    } else {
      newOpenGroups.add(groupKey)
    }
    setOpenGroups(newOpenGroups)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount)
  }

  const getActualStatus = (status: string, dueDate: string) => {
    if (status === 'paid') return 'paid'
    if (status === 'canceled') return 'canceled'

    const today = new Date()
    const due = new Date(dueDate)
    const isOverdue = due < today

    return isOverdue ? 'overdue' : 'pending'
  }

  if (Object.keys(groupedTransactions).length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Nenhuma transação encontrada
        </h3>
        <p className="text-sm text-muted-foreground">
          Tente ajustar os filtros ou adicionar uma nova transação
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedTransactions)
        .sort((a, b) => a[1].payTo.name.localeCompare(b[1].payTo.name, 'pt-BR'))
        .map(([groupKey, group]) => {
          const isOpen = openGroups.has(groupKey)
          const transactions = group.transactions || []

          // Calcular totais
          const { totalIncome, totalExpense } = transactions.reduce(
            (acc, t) => {
              const isViewerPayTo =
                t.payTo.email === currentUser?.email || t.payToId === currentUser?.id
              const effectiveType = isViewerPayTo
                ? t.type === 'income'
                  ? 'expense' // Se original é income e usuário é payTo, para ele é expense (deve pagar)
                  : 'income' // Se original é expense e usuário é payTo, para ele é income (deve receber)
                : t.type // Se usuário é owner, mantém o tipo original
              const amount = parseFloat(t.amount)
              if (effectiveType === 'income') acc.totalIncome += amount
              else acc.totalExpense += amount
              return acc
            },
            { totalIncome: 0, totalExpense: 0 }
          )
          const netTotal = totalIncome - totalExpense
          const overdueCount = transactions.filter(t => {
            const actualStatus = getActualStatus(t.status, t.dueDate)
            return actualStatus === 'overdue'
          }).length

          return (
            <Card
              key={groupKey}
              className="overflow-hidden rounded-2xl border border-border/40 shadow-sm bg-gradient-to-b from-card/70 to-card/40 backdrop-blur transition-all duration-200 hover:shadow-lg hover:border-border/60"
            >
              <button
                type="button"
                className="w-full p-4 text-left cursor-pointer"
                onClick={() => toggleGroup(groupKey)}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Recolher' : 'Expandir'} transações de ${(() => {
                  const firstTransaction = group.transactions[0]
                  const isCurrentUserPayTo = firstTransaction.payTo.email === currentUser?.email
                  return isCurrentUserPayTo ? firstTransaction.ownerName : group.payTo.name
                })()}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border border-primary/20 shadow-sm">
                      <span className="text-base font-bold text-primary">
                        {group.payTo.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-foreground truncate">
                        {group.payTo.name}
                      </CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {transactions.length} transação(ões)
                        </Badge>
                        {overdueCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {overdueCount} vencida(s)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Resumo financeiro */}
                    <div className="text-right">
                      <div className="text-sm font-medium flex items-center justify-end gap-1">
                        <span className="text-red-600">
                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(
                            totalExpense
                          )}
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-green-600">
                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(
                            totalIncome
                          )}
                        </span>
                        <span className="text-muted-foreground">=</span>
                        <span className="text-foreground">
                          {formatCurrency(Math.abs(netTotal))}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </button>

              {isOpen && (
                <CardContent className="p-4 pt-0">
                  <MobileCards
                    transactions={transactions.sort((a, b) =>
                      a.title.localeCompare(b.title, 'pt-BR')
                    )}
                    onRowSelect={(id, selected) => onRowSelect?.(id, selected)}
                    selectedRows={selectedRows}
                    onEdit={t => (onEdit ? onEdit(t) : onTransactionClick(t))}
                    onDuplicate={t => onDuplicate?.(t)}
                    onPay={id => onPay?.(id)}
                    onDelete={id => onDelete?.(id)}
                  />
                </CardContent>
              )}
            </Card>
          )
        })}
    </div>
  )
}
