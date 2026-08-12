import { CalendarClock } from 'lucide-react'

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
import { isScheduleDateValid } from '@/features/transactions/lib/schedule-payment-date'
import type { SettlementKind } from '@/features/transactions/lib/settlement-copy'
import { formatIsoDateLabel } from '@/lib/date'

export function ScheduledPaymentBanner({
  scheduledAt,
  expired,
  disabled,
  isScheduling,
  isCanceling,
  onReschedule,
  onCancel,
}: {
  scheduledAt: string
  expired?: boolean
  disabled: boolean
  isScheduling: boolean
  isCanceling: boolean
  onReschedule: () => void
  onCancel: () => void
}) {
  const dateLabel = formatIsoDateLabel(scheduledAt)
  return (
    <div
      className={
        expired
          ? 'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3'
          : 'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50/80 px-4 py-3'
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        <CalendarClock
          className={expired ? 'size-4 shrink-0 text-amber-700' : 'size-4 shrink-0 text-sky-600'}
        />
        <Badge
          variant="outline"
          className={
            expired
              ? 'border-amber-200 bg-white text-amber-900'
              : 'border-sky-200 bg-white text-sky-800'
          }
        >
          {expired
            ? `Agendamento expirou em ${dateLabel}`
            : `Pagamento agendado para ${dateLabel}`}
        </Badge>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isScheduling}
          onClick={onReschedule}
        >
          Reagendar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isCanceling}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}

interface SchedulePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: SettlementKind
  title: string
  scheduledDate: string
  onScheduledDateChange: (value: string) => void
  minDate: Date
  isScheduling: boolean
  onConfirm: () => void
}

export function SchedulePaymentDialog({
  open,
  onOpenChange,
  kind,
  title,
  scheduledDate,
  onScheduledDateChange,
  minDate,
  isScheduling,
  onConfirm,
}: SchedulePaymentDialogProps) {
  const description =
    kind === 'income'
      ? 'Informe a data em que o crédito está programado no banco. A transação continua pendente, aparece nos lançamentos do mês do crédito e some dos vencidos até essa data.'
      : 'Informe a data em que o débito está programado no banco. A transação continua pendente, aparece nos lançamentos do mês do débito e some dos vencidos até essa data.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{kind === 'income' ? 'Data do crédito' : 'Data do débito'}</Label>
          <DatePickerInput
            value={scheduledDate}
            onChange={onScheduledDateChange}
            minDate={minDate}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            type="button"
            disabled={!scheduledDate || !isScheduleDateValid(scheduledDate) || isScheduling}
            onClick={onConfirm}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
