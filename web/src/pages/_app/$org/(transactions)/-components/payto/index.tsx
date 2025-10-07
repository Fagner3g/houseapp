import { Calendar, ChevronDown, Clock, DollarSign, Users } from 'lucide-react'
import { useState } from 'react'

import type {
  ListTransactions200,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

interface Props {
  transactions: ListTransactions200['transactions']
  onTransactionClick: (transaction: ListTransactions200TransactionsItem) => void
}

export function PayToTransactions({ transactions, onTransactionClick }: Props) {
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

  // Agrupar transações por payTo
  const groupedTransactions = transactions.reduce(
    (acc, transaction) => {
      const payToKey = `${transaction.payTo.name} (${transaction.payTo.email})`

      if (!acc[payToKey]) {
        acc[payToKey] = {
          payTo: transaction.payTo,
          transactions: [],
        }
      }

      acc[payToKey].transactions.push(transaction)
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

  const getActualStatus = (status: string, dueDate: string) => {
    // Se já está pago ou cancelado, mantém o status
    if (status === 'paid' || status === 'canceled') {
      return status
    }

    // Se está pendente, verifica se está vencida
    const today = new Date()
    const due = new Date(dueDate)
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)

    if (due < today) {
      return 'overdue'
    }

    return status
  }

  const getStatusColor = (status: string, dueDate?: string) => {
    const actualStatus = dueDate ? getActualStatus(status, dueDate) : status

    switch (actualStatus) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'canceled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string, dueDate?: string) => {
    const actualStatus = dueDate ? getActualStatus(status, dueDate) : status

    switch (actualStatus) {
      case 'paid':
        return 'Pago'
      case 'pending':
        return 'Pendente'
      case 'overdue':
        return 'Vencida'
      case 'canceled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(amount))
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border border-primary/20">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
              Transações por Usuário
            </h2>
            <p className="hidden sm:block text-sm text-muted-foreground">
              Visualize transações agrupadas por responsável
            </p>
          </div>
        </div>
        {/* Chips resumo */}
        <div className="flex gap-2 flex-wrap sm:justify-end">
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs sm:text-sm font-medium">
            {Object.keys(groupedTransactions).length} usuário(s)
          </Badge>
          <Badge variant="outline" className="px-2.5 py-0.5 text-xs sm:text-sm">
            {transactions.length} transação(ões)
          </Badge>
        </div>
      </div>

      {Object.entries(groupedTransactions)
        .sort((a, b) => a[1].payTo.name.localeCompare(b[1].payTo.name, 'pt-BR'))
        .map(([groupKey, group]) => {
          const isOpen = openGroups.has(groupKey)
          const transactions = group.transactions || []
          // Totais por contexto (se o usuário visualizador é o payTo, invertimos o tipo)
          const { totalIncome, totalExpense } = transactions.reduce(
            (acc, t) => {
              const isViewerPayTo = t.payTo.email === currentUser?.email
              const effectiveType = isViewerPayTo
                ? t.type === 'income'
                  ? 'expense'
                  : 'income'
                : t.type
              const amount = parseFloat(t.amount)
              if (effectiveType === 'income') acc.totalIncome += amount
              else acc.totalExpense += amount
              return acc
            },
            { totalIncome: 0, totalExpense: 0 }
          )
          const netTotal = totalIncome - totalExpense
          const pendingCount = transactions.filter(t => {
            const actualStatus = getActualStatus(t.status, t.dueDate)
            return actualStatus === 'pending'
          }).length
          const overdueCount = transactions.filter(t => {
            const actualStatus = getActualStatus(t.status, t.dueDate)
            return actualStatus === 'overdue'
          }).length
          const canceledCount = transactions.filter(t => t.status === 'canceled').length

          return (
            <Card
              key={groupKey}
              className="overflow-hidden rounded-2xl border border-border/40 shadow-sm bg-gradient-to-b from-card/70 to-card/40 backdrop-blur cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-border/60"
              onClick={() => toggleGroup(groupKey)}
            >
              <CardHeader className="p-4 lg:p-6">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border border-primary/20 shadow-sm">
                      <span className="text-base font-bold text-primary">
                        {group.payTo.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base lg:text-lg font-semibold text-foreground truncate">
                        {group.payTo.name}
                      </CardTitle>
                    </div>
                    {/* Botão expandir recolher */}
                    <button
                      type="button"
                      aria-label={isOpen ? 'Recolher' : 'Expandir'}
                      aria-expanded={isOpen}
                      onClick={e => {
                        e.stopPropagation()
                        toggleGroup(groupKey)
                      }}
                      className="ml-2 h-7 w-7 rounded-full bg-muted/50 border border-border/40 flex items-center justify-center transition-transform duration-200 hover:bg-muted/70"
                    >
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 lg:items-end">
                    {/* Resumo (mobile: scroll horizontal; desktop: inline) */}
                    <div className="flex gap-2 whitespace-nowrap overflow-x-auto no-scrollbar pr-1 lg:overflow-visible">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 border border-green-200 text-[11px] lg:text-xs">
                        <DollarSign className="h-3 w-3" /> {formatCurrency(totalIncome.toFixed(2))}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 border border-red-200 text-[11px] lg:text-xs">
                        <DollarSign className="h-3 w-3" /> {formatCurrency(totalExpense.toFixed(2))}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 border text-[11px] lg:text-xs bg-muted text-foreground border-muted',
                          // mantém contraste adequado no tema atual
                          'dark:bg-neutral-800 dark:border-neutral-700'
                        )}
                        title="Saldo líquido (Receitas - Despesas)"
                      >
                        <span className="font-medium">Saldo</span>
                        <DollarSign className="h-3 w-3 opacity-70" />{' '}
                        {formatCurrency(Math.abs(netTotal).toFixed(2))}
                      </span>
                    </div>

                    {/* Status badges - versão desktop */}
                    <div className="hidden lg:flex items-center gap-2 flex-wrap justify-end">
                      {overdueCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-red-600 border-red-200 bg-red-50 px-2 py-1"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {overdueCount} vencida(s)
                        </Badge>
                      )}
                      {pendingCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-200 bg-amber-50 px-2 py-1"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {pendingCount} pendente(s)
                        </Badge>
                      )}
                      {canceledCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-gray-600 border-gray-200 bg-gray-50 px-2 py-1"
                        >
                          {canceledCount} cancelada(s)
                        </Badge>
                      )}
                    </div>

                    {/* Status compacto - mobile */}
                    <div className="flex lg:hidden gap-1 text-[11px] text-muted-foreground">
                      {overdueCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 border border-red-200">
                          <Clock className="h-3 w-3" /> {overdueCount} venc.
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 border border-amber-200">
                          <Clock className="h-3 w-3" /> {pendingCount} pend.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contador */}
                <div className="mt-2 flex items-center justify-between lg:justify-end gap-2 text-xs text-muted-foreground">
                  <span className="lg:hidden" />
                  <span className="px-2 py-0.5 rounded-full bg-muted/60 border border-border/40">
                    {transactions.length} transação(ões)
                  </span>
                </div>
              </CardHeader>

              {isOpen && (
                <>
                  <Separator className="mx-6" />
                  <CardContent className="p-6 pt-4">
                    <div className="space-y-4">
                      {transactions
                        .slice()
                        .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
                        .map((transaction, index) => (
                          <div key={transaction.id}>
                            <Button
                              variant="ghost"
                              onClick={e => {
                                e.stopPropagation() // Evita que o click propague para o card pai
                                onTransactionClick(transaction)
                              }}
                              className="w-full flex items-start justify-between p-4 h-auto hover:bg-muted/60 transition-all duration-200 rounded-xl border border-transparent hover:border-border/50"
                            >
                              <div className="flex items-center gap-4 flex-1">
                                {/* Ícone do tipo de transação */}
                                {(() => {
                                  const isViewerPayTo =
                                    transaction.payTo.email === currentUser?.email
                                  const effectiveType = isViewerPayTo
                                    ? transaction.type === 'income'
                                      ? 'expense'
                                      : 'income'
                                    : transaction.type
                                  const colorClass =
                                    effectiveType === 'income'
                                      ? 'bg-green-100 text-green-600'
                                      : 'bg-red-100 text-red-600'
                                  return (
                                    <div
                                      className={cn(
                                        'h-10 w-10 rounded-lg flex items-center justify-center',
                                        colorClass
                                      )}
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </div>
                                  )
                                })()}

                                {/* Informações principais */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-sm text-foreground truncate">
                                      {transaction.title}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-xs px-2 py-0.5',
                                        getStatusColor(transaction.status, transaction.dueDate)
                                      )}
                                    >
                                      {getStatusText(transaction.status, transaction.dueDate)}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span
                                        className={cn(
                                          getActualStatus(
                                            transaction.status,
                                            transaction.dueDate
                                          ) === 'overdue'
                                            ? 'text-red-600 font-medium'
                                            : ''
                                        )}
                                      >
                                        {getActualStatus(
                                          transaction.status,
                                          transaction.dueDate
                                        ) === 'overdue'
                                          ? `Vencida em ${formatDate(transaction.dueDate)}`
                                          : `Vence em ${formatDate(transaction.dueDate)}`}
                                      </span>
                                    </div>

                                    {transaction.description && (
                                      <div className="flex items-center gap-1">
                                        <span className="truncate max-w-[200px]">
                                          {transaction.description}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Tags removidas conforme solicitação */}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Valor */}
                                <div className="text-right">
                                  <p className="font-bold text-sm text-foreground">
                                    {formatCurrency(transaction.amount)}
                                  </p>
                                  {(() => {
                                    const isViewerPayTo =
                                      transaction.payTo.email === currentUser?.email
                                    const effectiveType = isViewerPayTo
                                      ? transaction.type === 'income'
                                        ? 'expense'
                                        : 'income'
                                      : transaction.type
                                    return (
                                      <p className="text-xs text-muted-foreground">
                                        {effectiveType === 'income' ? 'Receita' : 'Despesa'}
                                      </p>
                                    )
                                  })()}
                                </div>

                                {/* Tags foram movidas para abaixo das informações principais para melhor visualização */}
                              </div>
                            </Button>

                            {/* Separador entre transações */}
                            {index < transactions.length - 1 && <Separator className="my-3 mx-4" />}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          )
        })}

      {Object.keys(groupedTransactions).length === 0 && (
        <div className="text-center py-16">
          <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Nenhuma transação encontrada
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Não há transações para exibir nesta visualização. Crie uma nova transação para começar.
          </p>
        </div>
      )}
    </div>
  )
}
