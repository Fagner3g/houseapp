import { Calendar, ChevronDown, ChevronRight, Clock, DollarSign, Tag, Users } from 'lucide-react'
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

interface Props {
  transactions: ListTransactions200['transactions']
  onTransactionClick: (transaction: ListTransactions200TransactionsItem) => void
}

export function PayToTransactions({ transactions, onTransactionClick }: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

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
      {/* Header moderno */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border border-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Transações por Usuário</h2>
            <p className="text-sm text-muted-foreground">
              Visualize transações agrupadas por responsável
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
            {Object.keys(groupedTransactions).length} usuário(s)
          </Badge>
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {transactions.length} transação(ões)
          </Badge>
        </div>
      </div>

      {Object.entries(groupedTransactions).map(([groupKey, group]) => {
        const isOpen = openGroups.has(groupKey)
        const transactions = group.transactions || []
        const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
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
            className="overflow-hidden border-0 shadow-sm bg-card/50 backdrop-blur-sm cursor-pointer hover:bg-muted/30 hover:shadow-md transition-all duration-200"
            onClick={() => toggleGroup(groupKey)}
          >
            <CardHeader className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border border-primary/20 shadow-sm">
                    <span className="text-lg font-bold text-primary">
                      {group.payTo.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-foreground mb-1">
                      {group.payTo.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-medium">{group.payTo.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Estatísticas */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(totalAmount.toString())}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {transactions.length} transação(ões)
                    </p>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2">
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

                  {/* Ícone de expansão */}
                  <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            {isOpen && (
              <>
                <Separator className="mx-6" />
                <CardContent className="p-6 pt-4">
                  <div className="space-y-3">
                    {transactions.map((transaction, index) => (
                      <div key={transaction.id}>
                        <Button
                          variant="ghost"
                          onClick={e => {
                            e.stopPropagation() // Evita que o click propague para o card pai
                            onTransactionClick(transaction)
                          }}
                          className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/60 transition-all duration-200 rounded-xl border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {/* Ícone do tipo de transação */}
                            <div
                              className={cn(
                                'h-10 w-10 rounded-lg flex items-center justify-center',
                                transaction.type === 'income'
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-red-100 text-red-600'
                              )}
                            >
                              <DollarSign className="h-4 w-4" />
                            </div>

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
                                      getActualStatus(transaction.status, transaction.dueDate) ===
                                        'overdue'
                                        ? 'text-red-600 font-medium'
                                        : ''
                                    )}
                                  >
                                    {getActualStatus(transaction.status, transaction.dueDate) ===
                                    'overdue'
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
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Valor */}
                            <div className="text-right">
                              <p className="font-bold text-sm text-foreground">
                                {formatCurrency(transaction.amount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                              </p>
                            </div>

                            {/* Tags */}
                            {transaction.tags && transaction.tags.length > 0 && (
                              <div className="flex gap-1">
                                {transaction.tags.slice(0, 2).map(tag => (
                                  <Badge
                                    key={tag.name}
                                    variant="secondary"
                                    className="text-xs px-2 py-1 flex items-center gap-1"
                                    style={{
                                      backgroundColor: tag.color + '15',
                                      color: tag.color,
                                      borderColor: tag.color + '30',
                                    }}
                                  >
                                    <Tag className="h-3 w-3" />
                                    {tag.name}
                                  </Badge>
                                ))}
                                {transaction.tags.length > 2 && (
                                  <Badge variant="secondary" className="text-xs px-2 py-1">
                                    +{transaction.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </Button>

                        {/* Separador entre transações */}
                        {index < transactions.length - 1 && <Separator className="my-2 mx-4" />}
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
