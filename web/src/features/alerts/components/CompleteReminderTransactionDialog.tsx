import dayjs from 'dayjs'
import { Receipt } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePicker } from '@/components/ui/date-picker-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { centsToNumber, formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { useCompleteReminderPeriodWithTransaction, type Reminder } from '../api'

type CompleteReminderTransactionDialogProps = {
  slug: string
  reminder: Reminder | null
  occurrenceDate?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function resolveDefaultTransactionDate(
  reminder: Reminder,
  occurrenceDate?: string | null
): Date {
  const dateKey = occurrenceDate ?? reminder.dueDate
  return dayjs(dateKey).startOf('day').toDate()
}

export function CompleteReminderTransactionDialog({
  slug,
  reminder,
  occurrenceDate,
  open,
  onOpenChange,
  onSuccess,
}: CompleteReminderTransactionDialogProps) {
  const completeMutation = useCompleteReminderPeriodWithTransaction(slug)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const amountErrorId = useId()
  const amountHintId = useId()
  const [amount, setAmount] = useState<number | null>(null)
  const [transactionDate, setTransactionDate] = useState<Date | undefined>()
  const [description, setDescription] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const resetForm = () => {
    if (!reminder) {
      setAmount(null)
      setTransactionDate(undefined)
      setDescription('')
      setAmountTouched(false)
      setSubmitAttempted(false)
      return
    }
    setAmount(reminder.amountCents != null ? centsToNumber(reminder.amountCents) : null)
    setTransactionDate(resolveDefaultTransactionDate(reminder, occurrenceDate))
    setDescription(reminder.notes ?? '')
    setAmountTouched(false)
    setSubmitAttempted(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
  }

  useEffect(() => {
    if (!open || !reminder) return
    resetForm()
  }, [open, reminder?.id, occurrenceDate])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => amountInputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open, reminder?.id])

  const isAmountValid = amount != null && amount > 0
  const isDateValid = transactionDate != null
  const showAmountError = (amountTouched || submitAttempted) && !isAmountValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!reminder || !isAmountValid || amount == null || !transactionDate) return

    try {
      await completeMutation.mutateAsync({
        id: reminder.id,
        data: {
          amount: amount.toFixed(2),
          date: dayjs(transactionDate).format('YYYY-MM-DD'),
          description: description.trim() || undefined,
        },
      })
      onSuccess?.()
      onOpenChange(false)
    } catch {
      toast.error('Erro ao registrar transação')
    }
  }

  if (!reminder) return null

  const suggestedAmount =
    reminder.amountCents != null ? formatCurrency(centsToNumber(reminder.amountCents)) : null
  const amountDescribedBy = [
    suggestedAmount && !showAmountError ? amountHintId : null,
    showAmountError ? amountErrorId : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 px-6 pt-6">
          <DialogTitle>Concluir e registrar transação</DialogTitle>
          <DialogDescription>
            Informe o valor real para registrar no relatório e concluir o período.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 border-y bg-muted/40 px-6 py-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
            <Receipt className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{reminder.title}</p>
            {suggestedAmount ? (
              <p className="text-xs text-muted-foreground">
                Valor estimado: <span className="text-foreground">{suggestedAmount}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Valor variável — informe na conclusão</p>
            )}
          </div>
        </div>

        <form
          id="complete-reminder-transaction-form"
          onSubmit={handleSubmit}
          className="space-y-4 px-6 py-5"
        >
          <div className="space-y-2">
            <Label htmlFor="complete-amount">Valor</Label>
            <CurrencyInput
              id="complete-amount"
              ref={amountInputRef}
              value={amount}
              onValueChange={value => {
                setAmount(value)
                if (value != null && value > 0) {
                  setSubmitAttempted(false)
                }
              }}
              onBlur={() => setAmountTouched(true)}
              allowEmpty
              placeholder="0,00"
              required
              aria-invalid={showAmountError}
              aria-describedby={amountDescribedBy || undefined}
              className={cn(showAmountError && 'border-destructive focus-visible:ring-destructive/20')}
            />
            {suggestedAmount && !showAmountError && (
              <p id={amountHintId} className="text-xs text-muted-foreground">
                Use o valor estimado como referência ou informe o valor da fatura.
              </p>
            )}
            {showAmountError && (
              <p id={amountErrorId} className="text-xs text-destructive" role="alert">
                Informe um valor maior que zero
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="complete-transaction-date">Data da transação</Label>
            <div className="flex items-center gap-2">
              <DatePicker
                id="complete-transaction-date"
                value={transactionDate}
                onChange={setTransactionDate}
                placeholder="Selecione a data"
                buttonClassName="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setTransactionDate(dayjs().startOf('day').toDate())}
              >
                Hoje
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complete-description">Descrição (opcional)</Label>
            <Input
              id="complete-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={reminder.notes ?? 'Descrição da transação'}
            />
          </div>
        </form>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={completeMutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="complete-reminder-transaction-form"
            disabled={!isAmountValid || !isDateValid || completeMutation.isPending}
            isLoading={completeMutation.isPending}
            className="w-full sm:w-auto"
          >
            Registrar e concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
