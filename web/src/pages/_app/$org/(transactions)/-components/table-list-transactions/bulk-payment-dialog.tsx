import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { toast } from 'sonner'

import { getListTransactionsQueryKey, usePayTransaction } from '@/api/generated/api'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useActiveOrganization } from '@/hooks/use-active-organization'

interface Props {
  transactions: ListTransactions200TransactionsItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function BulkPaymentDialog({ transactions, open, onOpenChange, onSuccess }: Props) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const [isProcessing, setIsProcessing] = useState(false)

  const { mutate: payTransaction } = usePayTransaction({
    mutation: {
      onSuccess: () => {
        // Este callback será chamado para cada transação individual
        // Não fazemos invalidação aqui para evitar múltiplas invalidações
      },
      onError: () => {
        setIsProcessing(false)
        toast.error('Erro ao processar pagamentos')
      },
    },
  })

  const handlePayment = async () => {
    if (transactions.length === 0) return

    setIsProcessing(true)
    const allPaid = transactions.every(t => t.status === 'paid')

    try {
      // Processar todas as transações
      await Promise.all(
        transactions.map(transaction => {
          if (allPaid) {
            // Cancelar pagamento - não precisa de data
            return payTransaction({
              slug,
              id: transaction.id,
              data: {},
            })
          } else {
            // Marcar como pago na data de vencimento
            const finalPaymentDate = dayjs(transaction.dueDate).toDate()

            return payTransaction({
              slug,
              id: transaction.id,
              data: {
                paidAt: dayjs(finalPaymentDate).toISOString(),
              },
            })
          }
        })
      )

      // Pequeno delay para garantir que todas as transações foram processadas
      await new Promise(resolve => setTimeout(resolve, 100))

      // Invalidar cache após todos os pagamentos com refetch forçado
      await queryClient.invalidateQueries({
        queryKey: getListTransactionsQueryKey(slug),
        refetchType: 'all',
      })

      // Forçar refetch das queries para garantir atualização
      await queryClient.refetchQueries({
        queryKey: getListTransactionsQueryKey(slug),
      })

      toast.success(
        allPaid
          ? `Pagamentos cancelados com sucesso! (${transactions.length} transações)`
          : `Transações pagas com sucesso! (${transactions.length} transações)`
      )

      onSuccess?.()
      onOpenChange(false)
    } catch {
      toast.error('Erro ao processar pagamentos')
    } finally {
      setIsProcessing(false)
    }
  }

  const allPaid = transactions.every(t => t.status === 'paid')
  const selected = transactions.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] z-[99999]"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{allPaid ? 'Cancelar pagamento' : 'Marcar como pagas'}</DialogTitle>
          <DialogDescription>
            {allPaid
              ? `Tem certeza que deseja cancelar o pagamento de ${selected} transação(ões)?`
              : `As ${selected} transação(ões) serão pagas na data de vencimento de cada uma.`}
          </DialogDescription>
        </DialogHeader>

        {!allPaid && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Pagamento automático na data de vencimento
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Cada transação será paga na sua respectiva data de vencimento.
            </p>
          </div>
        )}

        <DialogFooter className="flex flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className={`flex-1 ${allPaid ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isProcessing ? 'Processando...' : allPaid ? 'Cancelar pagamento' : 'Marcar como pagas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
