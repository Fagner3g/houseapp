import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getListTransactionsQueryKey, usePayTransaction } from '@/api/generated/api'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'

interface Props {
  transaction: ListTransactions200TransactionsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function PaymentDateDialog({ transaction, open, onOpenChange, onSuccess }: Props) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())

  // Resetar o mês do calendário e a data de pagamento quando o modal abrir ou a transação mudar
  useEffect(() => {
    if (open && transaction) {
      const dueDate = dayjs(transaction.dueDate).toDate()
      setCalendarMonth(dueDate)
      setPaymentDate(dueDate)
    }
  }, [open, transaction])

  // Wrapper para controlar o fechamento do modal
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const { mutate: payTransaction, isPending } = usePayTransaction({
    mutation: {
      onSuccess: () => {
        const isPaid = transaction?.status === 'paid'

        if (isPaid) {
          toast.success('Pagamento cancelado com sucesso!')
        } else {
          // Calcular se foi pago no dia, com atraso ou antecipado
          const dueDate = dayjs(transaction?.dueDate)
          const paidDate = dayjs(paymentDate)
          const daysDiff = paidDate.diff(dueDate, 'day')

          let paymentStatus = ''
          let statusIcon = ''

          if (daysDiff > 0) {
            paymentStatus = `Pago com ${daysDiff} dia${daysDiff > 1 ? 's' : ''} de atraso`
            statusIcon = '⚠️'
          } else if (daysDiff < 0) {
            paymentStatus = `Pago ${Math.abs(daysDiff)} dia${Math.abs(daysDiff) > 1 ? 's' : ''} antes do vencimento`
            statusIcon = '✅'
          } else {
            paymentStatus = 'Pago no dia do vencimento'
            statusIcon = '🎯'
          }

          toast.success('Transação paga com sucesso!', {
            description: `${statusIcon} ${paymentStatus}`,
            duration: 4000,
          })
        }

        // Invalidar cache das transações
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })

        // Sempre fechar o modal após sucesso
        onOpenChange(false)

        // Chamar callback de sucesso (que pode fechar o drawer se for pagamento)
        onSuccess?.()
      },
      onError: () => {
        const isPaid = transaction?.status === 'paid'
        toast.error(isPaid ? 'Erro ao cancelar pagamento' : 'Erro ao pagar transação')
      },
    },
  })

  const handlePayment = () => {
    if (!transaction) return

    const isPaid = transaction.status === 'paid'

    if (isPaid) {
      // Cancelar pagamento - não precisa de data
      payTransaction({
        slug,
        id: transaction.id,
        data: {},
      })
    } else {
      // Marcar como pago
      // Se o usuário escolheu uma data, usa ela; caso contrário, usa hoje
      const finalPaymentDate = paymentDate ?? new Date()

      payTransaction({
        slug,
        id: transaction.id,
        data: {
          paidAt: dayjs(finalPaymentDate).toISOString(),
        },
      })
    }
  }

  const isPaid = transaction?.status === 'paid'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] z-[99999]"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{isPaid ? 'Cancelar pagamento' : 'Marcar como pago'}</DialogTitle>
          <DialogDescription>
            {isPaid
              ? 'Tem certeza que deseja cancelar o pagamento desta transação?'
              : 'Selecione a data em que a transação foi paga.'}
          </DialogDescription>
        </DialogHeader>

        {/* Informações da transação */}
        {transaction && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Transação:</span>
              <span className="text-sm">{transaction.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Valor:</span>
              <span className="text-sm font-semibold">
                R$ {(Number(transaction.amount) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Vencimento:</span>
              <span className="text-sm">{dayjs(transaction.dueDate).format('DD/MM/YYYY')}</span>
            </div>
          </div>
        )}

        {!isPaid && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Data do pagamento</span>
              <div>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-between font-normal',
                        !paymentDate && 'text-muted-foreground'
                      )}
                      type="button"
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        setCalendarOpen(!calendarOpen)
                      }}
                    >
                      {paymentDate ? paymentDate.toLocaleDateString('pt-BR') : 'Selecione a data'}
                      <ChevronDownIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[99999]" align="start">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      captionLayout="dropdown"
                      className="border-amber-400"
                      onSelect={date => {
                        if (date) {
                          setPaymentDate(date)
                          setCalendarOpen(false)
                        }
                      }}
                      disabled={date => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Informação sobre dias de atraso/adiantamento */}
            {paymentDate && transaction && (
              <div className="mt-3">
                {(() => {
                  const dueDate = dayjs(transaction.dueDate)
                  const paidDate = dayjs(paymentDate)
                  const daysDiff = paidDate.diff(dueDate, 'day')

                  if (daysDiff > 0) {
                    return (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-red-700 dark:text-red-300">
                            <strong>
                              Pago com {daysDiff} dia{daysDiff > 1 ? 's' : ''} de atraso
                            </strong>
                          </span>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Vencimento: {dueDate.format('DD/MM/YYYY')} • Pagamento:{' '}
                          {paidDate.format('DD/MM/YYYY')}
                        </p>
                      </div>
                    )
                  } else if (daysDiff < 0) {
                    return (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-700 dark:text-green-300">
                            <strong>
                              Pago {Math.abs(daysDiff)} dia{Math.abs(daysDiff) > 1 ? 's' : ''} antes
                              do vencimento
                            </strong>
                          </span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Vencimento: {dueDate.format('DD/MM/YYYY')} • Pagamento:{' '}
                          {paidDate.format('DD/MM/YYYY')}
                        </p>
                      </div>
                    )
                  } else {
                    return (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>Pago no dia do vencimento</strong>
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Vencimento: {dueDate.format('DD/MM/YYYY')} • Pagamento:{' '}
                          {paidDate.format('DD/MM/YYYY')}
                        </p>
                      </div>
                    )
                  }
                })()}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isPending}
            className={`flex-1 ${isPaid ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isPending ? 'Processando...' : isPaid ? 'Cancelar pagamento' : 'Marcar como pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
