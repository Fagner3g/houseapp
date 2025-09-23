import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { toast } from 'sonner'

import {
  getGetOrgSlugReportsTransactionsQueryKey,
  getListTransactionsQueryKey,
  useDeleteTransactions,
} from '@/api/generated/api'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { PaymentTimelineChartReal } from './payment-timeline-chart-real'

// Função utilitária para calcular informações de parcelas
function calculateInstallmentsInfo(
  installmentsTotal: number | null | undefined,
  installmentsPaid: number | null | undefined,
  status: 'paid' | 'pending' | 'canceled'
) {
  // Se installmentsTotal é null/undefined, é uma transação única
  const isRecurring = installmentsTotal !== null && installmentsTotal !== undefined

  if (!isRecurring) {
    // Transação única: sempre 1 parcela
    const paid = status === 'paid' ? 1 : 0
    return {
      total: 1,
      paid,
      remaining: 1 - paid,
      isRecurring: false,
    }
  }

  // Transação recorrente: usar valores do banco
  const total = installmentsTotal ?? 0
  const paid = installmentsPaid ?? 0
  const remaining = Math.max(0, total - paid)

  return {
    total,
    paid,
    remaining,
    isRecurring: true,
  }
}

interface Props {
  transaction: ListTransactions200TransactionsItem | null
  onDelete?: () => void
}

export function TransactionSummary({ transaction, onDelete }: Props) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()

  const { mutate: deleteTransactions, isPending: isDeleting } = useDeleteTransactions({
    mutation: {
      onSuccess: () => {
        toast.success('Transação excluída com sucesso!')

        // Invalidar cache das transações
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })

        // Invalidar cache do dashboard
        queryClient.invalidateQueries({
          queryKey: getGetOrgSlugReportsTransactionsQueryKey(slug),
        })

        // Chamar callback para fechar o drawer
        onDelete?.()
      },
      onError: () => {
        toast.error('Erro ao excluir transação')
      },
    },
  })

  if (!transaction) return null

  // Calcular informações de parcelas usando a função utilitária
  const installmentsInfo = calculateInstallmentsInfo(
    transaction.installmentsTotal,
    transaction.installmentsPaid,
    transaction.status
  )

  const handleDelete = (deleteAll: boolean = false) => {
    if (!transaction) return

    if (deleteAll) {
      // Deletar todas as transações da série
      deleteTransactions({
        slug,
        data: { ids: [transaction.serieId] }, // Usar serieId para deletar toda a série
      })
    } else {
      // Deletar apenas esta transação
      deleteTransactions({
        slug,
        data: { ids: [transaction.id] },
      })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Informações gerais</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-3 text-center gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Parcelas</p>
            <p className="font-semibold">{installmentsInfo.total}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pagas</p>
            <p className="font-semibold">{installmentsInfo.paid}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Faltantes</p>
            <p className="font-semibold">{installmentsInfo.remaining}</p>
          </div>
        </div>

        {/* Mostrar dias de atraso para transações pendentes */}
        {transaction.status === 'pending' && (
          <div className="pt-2 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Status do vencimento</p>
              {(() => {
                const dueDate = dayjs(transaction.dueDate)
                const today = dayjs()
                const daysDiff = today.diff(dueDate, 'day')

                if (daysDiff > 0) {
                  return (
                    <div className="mt-1">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {daysDiff} dia{daysDiff > 1 ? 's' : ''} em atraso
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Venceu em {dueDate.format('DD/MM/YYYY')}
                      </p>
                    </div>
                  )
                } else if (daysDiff < 0) {
                  return (
                    <div className="mt-1">
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        Vence em {Math.abs(daysDiff)} dia{Math.abs(daysDiff) > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vencimento: {dueDate.format('DD/MM/YYYY')}
                      </p>
                    </div>
                  )
                } else {
                  return (
                    <div className="mt-1">
                      <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                        Vence hoje
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vencimento: {dueDate.format('DD/MM/YYYY')}
                      </p>
                    </div>
                  )
                }
              })()}
            </div>
          </div>
        )}

        {transaction.status === 'paid' && transaction.paidAt && (
          <div className="pt-2 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Data do pagamento</p>
              <p className="font-semibold text-green-600 dark:text-green-400">
                {dayjs(transaction.paidAt).format('DD/MM/YYYY')}
              </p>
              {(() => {
                const dueDate = dayjs(transaction.dueDate)
                const paidDate = dayjs(transaction.paidAt)
                const daysLate = paidDate.diff(dueDate, 'day')

                if (daysLate > 0) {
                  return (
                    <div className="mt-1">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Pago com {daysLate} dia{daysLate > 1 ? 's' : ''} de atraso
                      </p>
                    </div>
                  )
                } else if (daysLate < 0) {
                  return (
                    <div className="mt-1">
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Pago {Math.abs(daysLate)} dia{Math.abs(daysLate) > 1 ? 's' : ''} antes do
                        vencimento
                      </p>
                    </div>
                  )
                } else {
                  return (
                    <div className="mt-1">
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Pago no dia do vencimento
                      </p>
                    </div>
                  )
                }
              })()}
            </div>
          </div>
        )}
        <PaymentTimelineChartReal transaction={transaction} />

        {/* Botão de deletar transação */}
        <div className="pt-4 border-t">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground text-center">Ações</p>

            {installmentsInfo.isRecurring ? (
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      disabled={isDeleting}
                    >
                      Deletar esta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deletar transação</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja deletar apenas esta transação? As outras transações
                        da série continuarão ativas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(false)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      disabled={isDeleting}
                    >
                      Deletar todas
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deletar todas as transações</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja deletar TODAS as transações desta série? Esta ação
                        não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(true)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Deletar todas
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    disabled={isDeleting}
                  >
                    Deletar transação
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deletar transação</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja deletar esta transação? Esta ação não pode ser
                      desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(false)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Deletar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
