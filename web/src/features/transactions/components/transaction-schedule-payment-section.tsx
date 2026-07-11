import dayjs from 'dayjs'
import { CalendarClock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getGetTransactionQueryKey,
  useCancelScheduledTransactionPayment,
  useScheduleTransactionPayment,
} from '@/api/generated/api'
import { invalidateTransactionQueries } from '@/features/transactions/lib/invalidate-transaction-queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DatePickerInput } from '@/components/ui/date-picker-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { readHttpErrorMessage } from '@/lib/http'
import { calendarDateToIso, formatIsoDateLabel, isoToCalendarDate } from '@/lib/date'

function defaultScheduleDate(dueDate: string, scheduledAt?: string | null): string {
  const today = dayjs().format('YYYY-MM-DD')
  if (scheduledAt) {
    const scheduled = isoToCalendarDate(scheduledAt)
    return scheduled < today ? today : scheduled
  }
  const due = isoToCalendarDate(dueDate) || dueDate.slice(0, 10)
  return due < today ? today : due
}

function isScheduleDateValid(value: string): boolean {
  return !dayjs(value).startOf('day').isBefore(dayjs().startOf('day'))
}

interface TransactionSchedulePaymentSectionProps {
  slug: string
  transactionId: string
  dueDate: string
  paymentScheduledAt: string | null | undefined
  disabled?: boolean
}

export function TransactionSchedulePaymentSection({
  slug,
  transactionId,
  dueDate,
  paymentScheduledAt,
  disabled = false,
}: TransactionSchedulePaymentSectionProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const today = useMemo(() => dayjs().startOf('day'), [])
  const [scheduledDate, setScheduledDate] = useState(() =>
    defaultScheduleDate(dueDate, paymentScheduledAt)
  )

  const { mutateAsync: schedulePayment, isPending: isScheduling } =
    useScheduleTransactionPayment()
  const { mutateAsync: cancelScheduledPayment, isPending: isCanceling } =
    useCancelScheduledTransactionPayment()

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(slug, transactionId) }),
      invalidateTransactionQueries(queryClient, slug),
    ])
  }

  const handleSchedule = async () => {
    if (!scheduledDate) return
    try {
      await schedulePayment({
        slug,
        id: transactionId,
        data: { scheduledAt: calendarDateToIso(scheduledDate) },
      })
      await invalidate()
      setDialogOpen(false)
      toast.success('Pagamento agendado')
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao agendar pagamento'))
    }
  }

  const handleCancel = async () => {
    try {
      await cancelScheduledPayment({ slug, id: transactionId })
      await invalidate()
      toast.success('Agendamento cancelado')
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao cancelar agendamento'))
    }
  }

  if (paymentScheduledAt) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarClock className="size-4 shrink-0 text-sky-600" />
          <Badge variant="outline" className="border-sky-200 bg-white text-sky-800">
            Pagamento agendado para {formatIsoDateLabel(paymentScheduledAt)}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-sky-800 hover:text-sky-950"
          disabled={disabled || isCanceling}
          onClick={() => void handleCancel()}
        >
          Cancelar agendamento
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={disabled}
        onClick={() => {
          setScheduledDate(defaultScheduleDate(dueDate))
          setDialogOpen(true)
        }}
      >
        <CalendarClock className="size-4" />
        Agendar pagamento
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar pagamento</DialogTitle>
            <DialogDescription>
              Informe a data em que o débito está programado no banco. A transação continua pendente,
              aparece nos lançamentos do mês do débito e some dos vencidos até essa data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Data do débito</Label>
            <DatePickerInput
              value={scheduledDate}
              onChange={setScheduledDate}
              minDate={today.toDate()}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Voltar
            </Button>
            <Button
              type="button"
              disabled={!scheduledDate || !isScheduleDateValid(scheduledDate) || isScheduling}
              onClick={() => void handleSchedule()}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
