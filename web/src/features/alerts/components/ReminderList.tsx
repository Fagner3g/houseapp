import { Check, Clock, MoreHorizontal, Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DrawerTransaction } from '@/components/drawer-transaction'
import type { NewTransactionSchema } from '@/components/drawer-transaction/schema'
import { LoadingErrorState } from '@/components/loading-error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DatePickerField } from '@/components/ui/date-picker-field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { centsToNumber } from '@/lib/currency'
import { alertStatusDotClass } from '@/lib/alert-status-colors'
import {
  useCompleteReminder,
  useCreateReminder,
  useDeleteReminder,
  useReminders,
  useSnoozeReminder,
  useUpdateReminder,
  type CreateReminderInput,
  type Reminder,
  type ReminderChannel,
} from '../api'
import { ReminderForm } from './ReminderForm'

type ReminderListProps = {
  slug: string
}

const CHANNEL_LABELS: Record<ReminderChannel, string> = {
  in_app: 'App',
  whatsapp: 'WhatsApp',
  extension: 'Extensão',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatRecurrenceShort(reminder: Reminder) {
  if (!reminder.isRecurring || !reminder.recurrenceType) return '—'
  const typeLabels: Record<string, string> = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
  }
  const typeLabel = typeLabels[reminder.recurrenceType] ?? reminder.recurrenceType
  if (reminder.recurrenceInterval > 1) {
    return `${typeLabel} (×${reminder.recurrenceInterval})`
  }
  return typeLabel
}

function formatAmount(cents: number | null) {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDaysBefore(days: number[]) {
  const sorted = [...days].sort((a, b) => b - a)
  return sorted.map(day => (day === 0 ? 'No dia' : `${day}d`)).join(', ')
}

function formatChannels(channels: ReminderChannel[]) {
  return channels.map(channel => CHANNEL_LABELS[channel]).join(', ')
}

function isSnoozed(reminder: Reminder) {
  if (!reminder.snoozedUntil) return false
  return new Date(reminder.snoozedUntil) > new Date()
}

function buildTransactionPrefill(reminder: Reminder): Partial<NewTransactionSchema> {
  return {
    title: reminder.title,
    dueDate: new Date(reminder.dueDate),
    amount:
      reminder.amountCents != null ? centsToNumber(reminder.amountCents).toFixed(2) : undefined,
    description: reminder.notes ?? undefined,
  }
}

function ReminderActions({
  onEdit,
  onComplete,
  onSnooze,
  onCustomSnooze,
  onCreateTransaction,
  onDelete,
}: {
  reminder: Reminder
  onEdit: () => void
  onComplete: () => void
  onSnooze: (days: number) => void
  onCustomSnooze: () => void
  onCreateTransaction: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button size="icon" variant="ghost" className="size-8" title="Editar" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="size-8" title="Concluir" onClick={onComplete}>
        <Check className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" title="Mais ações">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onSnooze(1)}>
            <Clock className="mr-2 h-4 w-4" />
            Adiar 1 dia
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSnooze(3)}>
            <Clock className="mr-2 h-4 w-4" />
            Adiar 3 dias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSnooze(7)}>
            <Clock className="mr-2 h-4 w-4" />
            Adiar 1 semana
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCustomSnooze}>
            <Clock className="mr-2 h-4 w-4" />
            Escolher data...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCreateTransaction}>
            <Receipt className="mr-2 h-4 w-4" />
            Criar transação
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function ReminderList({ slug }: ReminderListProps) {
  const { data, isLoading, error, refetch } = useReminders(slug)
  const createMutation = useCreateReminder(slug)
  const updateMutation = useUpdateReminder(slug)
  const completeMutation = useCompleteReminder(slug)
  const deleteMutation = useDeleteReminder(slug)
  const snoozeMutation = useSnoozeReminder(slug)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [transactionDrawerOpen, setTransactionDrawerOpen] = useState(false)
  const [transactionPrefill, setTransactionPrefill] = useState<Partial<NewTransactionSchema> | null>(
    null
  )
  const [linkReminderId, setLinkReminderId] = useState<string | null>(null)
  const [customSnoozeReminder, setCustomSnoozeReminder] = useState<Reminder | null>(null)
  const [customSnoozeDate, setCustomSnoozeDate] = useState<Date | undefined>()

  const reminders = data?.reminders ?? []
  const drawerKey = useMemo(
    () => `${transactionPrefill?.title ?? 'new'}-${transactionPrefill?.dueDate?.toISOString() ?? ''}`,
    [transactionPrefill]
  )

  const handleCreate = async (input: CreateReminderInput) => {
    try {
      await createMutation.mutateAsync(input)
      toast.success('Lembrete criado')
      setFormOpen(false)
    } catch {
      toast.error('Erro ao criar lembrete')
    }
  }

  const handleUpdate = async (input: CreateReminderInput) => {
    if (!editing) return
    try {
      await updateMutation.mutateAsync({ id: editing.id, data: input })
      toast.success('Lembrete atualizado')
      setEditing(null)
      setFormOpen(false)
    } catch {
      toast.error('Erro ao atualizar lembrete')
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await completeMutation.mutateAsync(id)
      toast.success('Lembrete concluído')
    } catch {
      toast.error('Erro ao concluir lembrete')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lembrete?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Lembrete excluído')
    } catch {
      toast.error('Erro ao excluir lembrete')
    }
  }

  const handleSnooze = async (id: string, days: number) => {
    try {
      await snoozeMutation.mutateAsync({ id, data: { days } })
      toast.success(`Lembrete adiado por ${days} dia(s)`)
    } catch {
      toast.error('Erro ao adiar lembrete')
    }
  }

  const handleCustomSnooze = async () => {
    if (!customSnoozeReminder || !customSnoozeDate) return
    try {
      await snoozeMutation.mutateAsync({
        id: customSnoozeReminder.id,
        data: { until: customSnoozeDate.toISOString() },
      })
      toast.success(`Lembrete adiado até ${formatDate(customSnoozeDate.toISOString())}`)
      setCustomSnoozeReminder(null)
      setCustomSnoozeDate(undefined)
    } catch {
      toast.error('Erro ao adiar lembrete')
    }
  }

  const handleCreateTransaction = (reminder: Reminder) => {
    setLinkReminderId(reminder.id)
    setTransactionPrefill(buildTransactionPrefill(reminder))
    setTransactionDrawerOpen(true)
  }

  const handleTransactionCreated = async ({ seriesId }: { seriesId: string }) => {
    if (!linkReminderId) return

    const reminderId = linkReminderId
    setLinkReminderId(null)

    try {
      await updateMutation.mutateAsync({
        id: reminderId,
        data: { linkedSeriesId: seriesId },
      })
      toast.success('Transação criada e lembrete vinculado')
    } catch {
      toast.success('Transação criada, mas falhou ao vincular ao lembrete')
    }
  }

  if (isLoading || error) {
    return <LoadingErrorState isLoading={isLoading} error={error} onRetry={refetch} />
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
        <p className="text-sm text-muted-foreground">
          <span className={`mr-1.5 inline-block size-2 rounded-full align-middle ${alertStatusDotClass.reminder}`} />
          {reminders.length} lembrete(s) ativo(s)
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo lembrete
        </Button>
      </div>

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum lembrete cadastrado. Crie o primeiro para receber alertas.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden sm:table-cell">Vencimento</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Valor</TableHead>
                  <TableHead className="hidden lg:table-cell">Recorrência</TableHead>
                  <TableHead className="hidden md:table-cell">Alertas</TableHead>
                  <TableHead className="hidden lg:table-cell">Canais</TableHead>
                  <TableHead className="w-[108px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map(reminder => {
                  const snoozed = isSnoozed(reminder)
                  const daysLabel = formatDaysBefore(reminder.daysBefore)
                  const channelsLabel = formatChannels(reminder.channels)

                  return (
                    <TableRow key={reminder.id}>
                      <TableCell className="max-w-[200px]">
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate font-medium">{reminder.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {reminder.recipientName ?? 'Sem destinatário'}
                            {reminder.notes ? ` · ${reminder.notes}` : ''}
                          </p>
                          <div className="flex flex-wrap items-center gap-1 sm:hidden">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(reminder.dueDate)}
                            </span>
                            {snoozed && reminder.snoozedUntil && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                Adiado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{formatDate(reminder.dueDate)}</span>
                          {snoozed && reminder.snoozedUntil && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                  Adiado
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Adiado até {formatDate(reminder.snoozedUntil)}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right whitespace-nowrap tabular-nums">
                        {formatAmount(reminder.amountCents)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                        {formatRecurrenceShort(reminder)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[140px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate text-muted-foreground">{daysLabel}</span>
                          </TooltipTrigger>
                          <TooltipContent>{daysLabel}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[120px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate text-muted-foreground">
                              {channelsLabel}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{channelsLabel}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <ReminderActions
                          onEdit={() => {
                            setEditing(reminder)
                            setFormOpen(true)
                          }}
                          onComplete={() => handleComplete(reminder.id)}
                          onSnooze={days => handleSnooze(reminder.id, days)}
                          onCustomSnooze={() => {
                            setCustomSnoozeReminder(reminder)
                            setCustomSnoozeDate(undefined)
                          }}
                          onCreateTransaction={() => handleCreateTransaction(reminder)}
                          onDelete={() => handleDelete(reminder.id)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ReminderForm
        slug={slug}
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        reminder={editing}
        onSubmit={editing ? handleUpdate : handleCreate}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog
        open={!!customSnoozeReminder}
        onOpenChange={open => {
          if (!open) {
            setCustomSnoozeReminder(null)
            setCustomSnoozeDate(undefined)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pr-8">
            <DialogTitle>Adiar lembrete</DialogTitle>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCustomSnoozeReminder(null)
                  setCustomSnoozeDate(undefined)
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCustomSnooze}
                disabled={!customSnoozeDate || snoozeMutation.isPending}
                isLoading={snoozeMutation.isPending}
              >
                Confirmar
              </Button>
            </div>
          </DialogHeader>
          <DatePickerField
            label="Adiar até"
            value={customSnoozeDate}
            onChange={setCustomSnoozeDate}
            minDate={new Date()}
            placeholder="Selecione a data"
          />
        </DialogContent>
      </Dialog>

      {transactionDrawerOpen && (
        <DrawerTransaction
          key={drawerKey}
          transaction={null}
          open={transactionDrawerOpen}
          createPrefill={transactionPrefill ?? undefined}
          onCreateSuccess={handleTransactionCreated}
          onOpenChange={open => {
            setTransactionDrawerOpen(open)
            if (!open) {
              setTransactionPrefill(null)
              setLinkReminderId(null)
            }
          }}
        />
      )}
    </div>
  )
}
