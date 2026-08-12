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
import { isFutureScheduled } from '@/features/transactions/lib/payable-status'
import { defaultScheduleDate } from '@/features/transactions/lib/schedule-payment-date'
import { Button } from '@/components/ui/button'
import { readHttpErrorMessage } from '@/lib/http'
import { calendarDateToIso } from '@/lib/date'
import {
  scheduleSettlementButtonLabel,
  type SettlementKind,
} from '@/features/transactions/lib/settlement-copy'

import { SchedulePaymentDialog, ScheduledPaymentBanner } from './schedule-payment-dialog'

interface TransactionSchedulePaymentSectionProps {
  slug: string
  transactionId: string
  dueDate: string
  paymentScheduledAt: string | null | undefined
  kind?: SettlementKind
  disabled?: boolean
}

export function TransactionSchedulePaymentSection({
  slug,
  transactionId,
  dueDate,
  paymentScheduledAt,
  kind = 'expense',
  disabled = false,
}: TransactionSchedulePaymentSectionProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const today = useMemo(() => dayjs().startOf('day'), [])
  const [scheduledDate, setScheduledDate] = useState(() =>
    defaultScheduleDate(dueDate, paymentScheduledAt)
  )
  const isScheduled = isFutureScheduled({
    status: 'pending',
    date: dueDate,
    paymentScheduledAt,
  })

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

  const openDialog = () => {
    setScheduledDate(defaultScheduleDate(dueDate, paymentScheduledAt))
    setDialogOpen(true)
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

  return (
    <>
      {paymentScheduledAt ? (
        <ScheduledPaymentBanner
          scheduledAt={paymentScheduledAt}
          expired={!isScheduled}
          disabled={disabled}
          isScheduling={isScheduling}
          isCanceling={isCanceling}
          onReschedule={openDialog}
          onCancel={() => void handleCancel()}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled}
          onClick={openDialog}
        >
          <CalendarClock className="size-4" />
          {scheduleSettlementButtonLabel(kind)}
        </Button>
      )}

      <SchedulePaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kind={kind}
        title={paymentScheduledAt ? 'Reagendar pagamento' : scheduleSettlementButtonLabel(kind)}
        scheduledDate={scheduledDate}
        onScheduledDateChange={setScheduledDate}
        minDate={today.toDate()}
        isScheduling={isScheduling}
        onConfirm={() => void handleSchedule()}
      />
    </>
  )
}
