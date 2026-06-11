import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useCompleteReminderPeriod,
  useUncompleteReminderPeriod,
  type Reminder,
} from '@/features/alerts/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { centsToNumber, formatCurrency } from '@/lib/currency'
import { computeDaysUntilDue } from '@/lib/date'
import {
  isCurrentReminderOccurrence,
  isReminderOccurrenceCompleted,
} from './reminder-events'

interface Props {
  reminder: Reminder | null
  occurrenceDate: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getReminderStatusBadges(
  reminder: Reminder,
  occurrenceDate: string,
  isCompleted: boolean
): Array<{ label: string; variant: 'reminder' | 'secondary' | 'destructive' | 'warning' }> {
  const badges: Array<{
    label: string
    variant: 'reminder' | 'secondary' | 'destructive' | 'warning'
  }> = [{ label: 'Lembrete', variant: 'reminder' }]

  if (isCompleted) {
    badges.push({ label: 'Concluído', variant: 'secondary' })
    return badges
  }

  const daysUntilDue = computeDaysUntilDue(new Date(occurrenceDate))
  if (daysUntilDue < 0) {
    badges.push({ label: 'Vencido', variant: 'destructive' })
  } else if (daysUntilDue <= 7) {
    badges.push({ label: 'Próximo', variant: 'warning' })
  }

  if (reminder.snoozedUntil) {
    badges.push({ label: 'Adiado', variant: 'warning' })
  }

  return badges
}

export function ReminderDialog({ reminder, occurrenceDate, open, onOpenChange }: Props) {
  const { slug } = useActiveOrganization()
  const completePeriodMutation = useCompleteReminderPeriod(slug)
  const uncompletePeriodMutation = useUncompleteReminderPeriod(slug)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!reminder || !occurrenceDate) return null

  const isCompleted = isReminderOccurrenceCompleted(reminder, occurrenceDate)
  const canComplete =
    !isCompleted &&
    isCurrentReminderOccurrence(reminder, occurrenceDate) &&
    reminder.active &&
    !reminder.completedAt
  const statusBadges = getReminderStatusBadges(reminder, occurrenceDate, isCompleted)

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      await completePeriodMutation.mutateAsync(reminder.id)
      toast.success('Lembrete marcado como feito no mês')
      onOpenChange(false)
    } catch {
      toast.error('Erro ao marcar lembrete como feito')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUncomplete = async () => {
    setIsSubmitting(true)
    try {
      await uncompletePeriodMutation.mutateAsync({
        id: reminder.id,
        occurrenceDate,
      })
      toast.success('Lembrete desmarcado como concluído')
      onOpenChange(false)
    } catch {
      toast.error('Erro ao desmarcar lembrete')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="min-w-0">{reminder.title}</span>
            {statusBadges.map(badge => (
              <Badge key={badge.label} variant={badge.variant}>
                {badge.label}
              </Badge>
            ))}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 text-sm">
          <p>
            <span className="font-medium">Vencimento:</span>{' '}
            {format(new Date(occurrenceDate), "d 'de' MMMM yyyy", { locale: ptBR })}
          </p>
          {reminder.amountCents != null && (
            <p>
              <span className="font-medium">Valor:</span>{' '}
              {formatCurrency(centsToNumber(reminder.amountCents))}
            </p>
          )}
          {reminder.recipientName && (
            <p>
              <span className="font-medium">Destinatário:</span> {reminder.recipientName}
            </p>
          )}
          {reminder.notes && (
            <p>
              <span className="font-medium">Observações:</span> {reminder.notes}
            </p>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {canComplete && (
            <Button
              type="button"
              onClick={handleComplete}
              disabled={isSubmitting}
              className="w-full"
            >
              Marcar como feito no mês
            </Button>
          )}
          {isCompleted && (
            <Button
              type="button"
              variant="outline"
              onClick={handleUncomplete}
              disabled={isSubmitting}
              className="w-full"
            >
              Desmarcar como concluído
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
