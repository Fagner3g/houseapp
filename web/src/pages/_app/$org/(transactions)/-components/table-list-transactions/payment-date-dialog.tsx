import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  getGetTransactionInstallmentsQueryKey,
  getListTransactionsQueryKey,
  usePayTransaction,
} from '@/api/generated/api'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CurrencyInput } from '@/components/ui/currency-input'
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
  const [paymentAmount, setPaymentAmount] = useState<number>(0)

  const totalAmount = useMemo(
    () => (transaction ? Number(transaction.amount) : 0),
    [transaction]
  )

  const alreadyPaid = useMemo(
    () => (transaction?.status === 'partial' ? (transaction.valuePaid ?? 0) / 100 : 0),
    [transaction]
  )

  const remainingAmount = useMemo(
    () => totalAmount - alreadyPaid,
    [totalAmount, alreadyPaid]
  )

  const isPaid = transaction?.status === 'paid'
  const isPartial = transaction?.status === 'partial'

  // Resetar o mês do calendário, data de pagamento e valor quando o modal abrir ou a transação mudar
  useEffect(() => {
    if (open && transaction) {
      const dueDate = dayjs(transaction.dueDate).toDate()
      setCalendarMonth(dueDate)
      setPaymentDate(dueDate)
      if (isPartial) {
        setPaymentAmount(remainingAmount)
      } else {
        setPaymentAmount(totalAmount)
      }
    }
  }, [open, transaction, totalAmount, remainingAmount, isPartial])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const { mutate: payTransaction, isPending } = usePayTransaction({
    mutation: {
      onSuccess: () => {
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

        const fullPaid = isPartial
          ? Math.abs(paymentAmount - remainingAmount) < 0.001
          : Math.abs(paymentAmount - totalAmount) < 0.001

        if (fullPaid) {
          toast.success('Transação paga com sucesso!', {
            description: `${statusIcon} ${paymentStatus}`,
            duration: 4000,
          })
        } else {
          toast.success(
            isPartial ? 'Pagamento adicional registrado!' : 'Pagamento parcial registrado!',
            {
              description: `${statusIcon} Pago R$ ${paymentAmount.toFixed(2)} de R$ ${maxAmount.toFixed(2)}`,
              duration: 4000,
            }
          )
        }

        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })

        if (transaction?.serieId) {
          queryClient.invalidateQueries({
            queryKey: getGetTransactionInstallmentsQueryKey(slug, transaction.serieId),
          })
        }

        onOpenChange(false)
        onSuccess?.()
      },
      onError: () => {
        toast.error('Erro ao processar pagamento')
      },
    },
  })

  const handleCancelPayment = () => {
    if (!transaction) return
    payTransaction({
      slug,
      id: transaction.id,
      data: {},
    })
  }

  const handlePayment = () => {
    if (!transaction) return

    if (isPaid) {
      payTransaction({ slug, id: transaction.id, data: {} })
      return
    }

    const finalPaymentDate = paymentDate ?? new Date()
    const data: { paidAt: string; paidAmount?: number } = {
      paidAt: dayjs(finalPaymentDate).toISOString(),
    }

    const fullPaid = isPartial
      ? Math.abs(paymentAmount - remainingAmount) < 0.001
      : Math.abs(paymentAmount - totalAmount) < 0.001

    if (!fullPaid) {
      data.paidAmount = isPartial ? paymentAmount : paymentAmount
    }

    payTransaction({ slug, id: transaction.id, data })
  }

  const maxAmount = isPartial ? remainingAmount : totalAmount
  const amountInputDisabled = isPartial && Math.abs(remainingAmount) < 0.001
  const canConfirm = paymentAmount > 0 && paymentAmount <= maxAmount && !amountInputDisabled

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] z-[99999]"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {isPaid
              ? 'Cancelar pagamento'
              : isPartial
                ? 'Continuar pagamento'
                : 'Marcar como pago'}
          </DialogTitle>
          <DialogDescription>
            {isPaid
              ? 'Tem certeza que deseja cancelar o pagamento desta transação?'
              : isPartial
                ? `Já foi pago R$ ${alreadyPaid.toFixed(2)} de R$ ${totalAmount.toFixed(2)}. Adicione mais um valor ou cancele.`
                : 'Selecione a data e o valor do pagamento.'}
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
              <span className="text-sm font-medium">Valor total:</span>
              <span className="text-sm font-semibold">
                R$ {totalAmount.toFixed(2)}
              </span>
            </div>
            {isPartial && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Já pago:</span>
                <span className="text-sm font-semibold text-amber-600">
                  R$ {alreadyPaid.toFixed(2)}
                </span>
              </div>
            )}
            {isPartial && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Restante:</span>
                <span className="text-sm font-semibold text-orange-600">
                  R$ {remainingAmount.toFixed(2)}
                </span>
              </div>
            )}
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

            <div className="grid gap-2">
              <span className="text-sm font-medium">
                {isPartial ? 'Valor a adicionar' : 'Valor do pagamento'}
              </span>
              <CurrencyInput
                value={paymentAmount}
                onValueChange={setPaymentAmount}
                className="w-full"
                placeholder="R$ 0,00"
              />
              {isPartial && (
                <p className="text-xs text-muted-foreground">
                  Restante: R$ {remainingAmount.toFixed(2)}
                </p>
              )}
              {paymentAmount > maxAmount && (
                <p className="text-xs text-red-500">
                  Valor não pode ser maior que R$ {maxAmount.toFixed(2)}
                </p>
              )}
              {paymentAmount <= 0 && (
                <p className="text-xs text-red-500">Valor deve ser maior que zero</p>
              )}
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
          {!isPaid && !isPartial ? (
            <>
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
                disabled={isPending || !canConfirm}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isPending
                  ? 'Processando...'
                  : paymentAmount > 0 && paymentAmount < totalAmount
                    ? `Pagar R$ ${paymentAmount.toFixed(2)}`
                    : 'Pagar valor total'}
              </Button>
            </>
          ) : isPartial ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelPayment}
                disabled={isPending}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                Cancelar pagamento parcial
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isPending || !canConfirm}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isPending
                  ? 'Processando...'
                  : Math.abs(paymentAmount - remainingAmount) < 0.001
                    ? 'Pagar restante'
                    : `Adicionar R$ ${paymentAmount.toFixed(2)}`}
              </Button>
            </>
          ) : (
            <>
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
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isPending ? 'Processando...' : 'Cancelar pagamento'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
