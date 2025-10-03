import { IconCashRegister, IconCircleCheckFilled } from '@tabler/icons-react'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  LucideClockFading,
  MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth'

interface MobileCardsProps {
  transactions: ListTransactions200TransactionsItem[]
  onRowSelect: (id: string, selected: boolean) => void
  selectedRows: string[]
  onEdit: (transaction: ListTransactions200TransactionsItem) => void
  onDuplicate: (transaction: ListTransactions200TransactionsItem) => void
  onPay: (id: string) => void
  onDelete: (id: string) => void
}

export function MobileCards({
  transactions,
  onRowSelect,
  selectedRows,
  onEdit,
  onDuplicate,
  onPay,
  onDelete,
}: MobileCardsProps) {
  const currentUser = useAuthStore(s => s.user)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount / 100)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getStatusIcon = (transaction: ListTransactions200TransactionsItem) => {
    const today = new Date()
    const dueDate = new Date(transaction.dueDate)
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (transaction.status === 'paid') {
      return <IconCircleCheckFilled className="h-4 w-4 fill-green-500 dark:fill-green-400" />
    }

    if (transaction.status === 'pending') {
      if (transaction.overdueDays > 0 && transaction.overdueDays <= 5) {
        return <AlertOctagon className="h-4 w-4 text-red-400" />
      }
      if (transaction.overdueDays > 5) {
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      }
      if (transaction.overdueDays === 0 && daysUntilDue > 5) {
        return <LucideClockFading className="h-4 w-4 text-gray-500" />
      }
      if (transaction.overdueDays === 0 && daysUntilDue <= 5) {
        return <LucideClockFading className="h-4 w-4 text-yellow-500" />
      }
    }

    return null
  }

  const getTypeIcon = (transaction: ListTransactions200TransactionsItem) => {
    const contextualizedType = transaction.contextualizedType || transaction.type
    return contextualizedType === 'expense' ? (
      <ArrowDown className="h-4 w-4 text-red-600" />
    ) : (
      <ArrowUp className="h-4 w-4 text-green-500" />
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
          <IconCashRegister className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          Nenhuma transação encontrada
        </h3>
        <p className="text-sm text-muted-foreground">Comece adicionando sua primeira transação.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {transactions.map(transaction => {
        const isSelected = selectedRows.includes(transaction.id)
        const isExpanded = expandedCard === transaction.id

        return (
          <button
            key={transaction.id}
            type="button"
            className={`bg-card border rounded-lg p-3 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer w-full text-left ${
              isSelected ? 'ring-2 ring-primary/20 border-primary/30' : ''
            }`}
            onClick={() => onEdit(transaction)}
            aria-label={`Editar transação ${transaction.title}`}
          >
            {/* Header do card */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={checked => onRowSelect(transaction.id, !!checked)}
                  onClick={e => e.stopPropagation()}
                  aria-label="Selecionar transação"
                  className="h-4 w-4"
                />
                <div className="flex items-center gap-1.5">
                  {getTypeIcon(transaction)}
                  <h3 className="font-semibold text-sm truncate">{transaction.title}</h3>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  {getStatusIcon(transaction)}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(transaction.dueDate)}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(transaction)}>
                    {currentUser?.id === transaction.ownerId ? 'Editar' : 'Visualizar'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(transaction)}>
                    Duplicar
                  </DropdownMenuItem>
                  {currentUser?.id === transaction.ownerId && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onPay(transaction.id)}>
                        {transaction.status === 'paid' ? 'Cancelar Pagamento' : 'Marcar como Pago'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(transaction.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Valor e tags */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-lg font-bold">
                  {formatCurrency(Number(transaction.amount))}
                </span>
              </div>

              {/* Tags */}
              {transaction.tags && transaction.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {transaction.tags.slice(0, 2).map((tag, index) => (
                    <Badge
                      key={`${transaction.id}-tag-${index}`}
                      style={{ backgroundColor: typeof tag === 'object' ? tag.color : undefined }}
                      className="text-white text-xs px-1.5 py-0.5"
                    >
                      #{typeof tag === 'string' ? tag : tag.name || 'Tag'}
                    </Badge>
                  ))}
                  {transaction.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      +{transaction.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Informações expandidas */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pt-2 border-t space-y-2 mt-2">
                {transaction.installmentsTotal && transaction.installmentsTotal > 1 && (
                  <div className="flex justify-between items-center animate-in slide-in-from-top-1 duration-200 delay-75">
                    <span className="text-xs text-muted-foreground">Parcelas</span>
                    <span className="text-xs font-medium">
                      {Number(transaction.installmentsPaid) || 0} de {transaction.installmentsTotal}
                    </span>
                  </div>
                )}

                {transaction.paidAt && (
                  <div className="flex justify-between items-center animate-in slide-in-from-top-1 duration-200 delay-100">
                    <span className="text-xs text-muted-foreground">Pago em</span>
                    <span className="text-xs font-medium">{formatDate(transaction.paidAt)}</span>
                  </div>
                )}

                {transaction.payTo && (
                  <div className="flex justify-between items-center animate-in slide-in-from-top-1 duration-200 delay-125">
                    <span className="text-xs text-muted-foreground">Para</span>
                    <span className="text-xs font-medium">{transaction.payTo}</span>
                  </div>
                )}

                {transaction.ownerName && (
                  <div className="flex justify-between items-center animate-in slide-in-from-top-1 duration-200 delay-150">
                    <span className="text-xs text-muted-foreground">Responsável</span>
                    <span className="text-xs font-medium">{transaction.ownerName}</span>
                  </div>
                )}

                {/* Todas as tags quando expandido */}
                {transaction.tags && transaction.tags.length > 2 && (
                  <div className="flex gap-1 flex-wrap animate-in slide-in-from-top-1 duration-200 delay-175">
                    {transaction.tags.slice(2).map((tag, index) => (
                      <Badge
                        key={`${transaction.id}-tag-expanded-${index}`}
                        style={{ backgroundColor: typeof tag === 'object' ? tag.color : undefined }}
                        className="text-white text-xs px-1.5 py-0.5"
                      >
                        #{typeof tag === 'string' ? tag : tag.name || 'Tag'}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Botão para expandir/recolher */}
            {((transaction.installmentsTotal && transaction.installmentsTotal > 1) ||
              transaction.paidAt ||
              transaction.payTo ||
              transaction.ownerName ||
              (transaction.tags && transaction.tags.length > 2)) && (
              <div className="pt-1 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    setExpandedCard(isExpanded ? null : transaction.id)
                  }}
                  className="w-full text-xs h-6"
                >
                  {isExpanded ? (
                    <>
                      <span>Ver menos</span>
                      <ArrowUp className="ml-1 h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span>Ver mais</span>
                      <ArrowDown className="ml-1 h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
