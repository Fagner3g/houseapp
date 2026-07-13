import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import {
  getAlertSettings,
  parseTimeInputValue,
  toTimeInputValue,
  updateAlertSettings,
} from '../api/alert-settings'
import { formatNextNotifyRun } from '../lib/next-notify-run'

export function AlertsScheduleRow() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const notifyTimeId = useId()
  const [timeValue, setTimeValue] = useState('09:00')

  const { data, isLoading } = useQuery({
    queryKey: ['alert-settings', slug],
    queryFn: () => getAlertSettings(slug as string),
    enabled: !!slug,
  })

  const { mutateAsync: saveSettings, isPending } = useMutation({
    mutationFn: (value: string) => {
      const parsed = parseTimeInputValue(value)
      if (!parsed) {
        throw new Error('invalid-time')
      }
      return updateAlertSettings(slug as string, parsed)
    },
    onSuccess: saved => {
      queryClient.setQueryData(['alert-settings', slug], saved)
      toast.success('Horário atualizado. Alertas de hoje liberados para reenvio.')
    },
    onError: error => {
      if (error instanceof Error && error.message === 'invalid-time') {
        toast.error('Horário inválido')
        return
      }
      toast.error('Erro ao salvar horário')
    },
  })

  useEffect(() => {
    if (data) {
      setTimeValue(toTimeInputValue(data.defaultNotifyHour, data.defaultNotifyMinute))
    }
  }, [data])

  const parsedTime = parseTimeInputValue(timeValue)
  const nextRunLabel =
    parsedTime != null
      ? formatNextNotifyRun(parsedTime.defaultNotifyHour, parsedTime.defaultNotifyMinute)
      : null

  const handleSave = async () => {
    if (!slug) return
    await saveSettings(timeValue)
  }

  return (
    <div className="space-y-3 border-b border-slate-100 pb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor={notifyTimeId}>Horário diário</Label>
          <div className="relative max-w-[160px]">
            <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id={notifyTimeId}
              type="time"
              value={timeValue}
              disabled={isLoading || isPending}
              className="pl-9"
              onChange={event => setTimeValue(event.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          className="bg-slate-900"
          disabled={isLoading || isPending || !timeValue}
          onClick={() => void handleSave()}
        >
          Salvar horário
        </Button>
      </div>
      {nextRunLabel && <p className="text-sm text-slate-600">{nextRunLabel}</p>}
      <p className="text-xs text-slate-500">
        Fuso {data?.timezone ?? 'America/Sao_Paulo'}. App e Extensão entregam na hora. WhatsApp só
        quando habilitado nas regras abaixo.
      </p>
    </div>
  )
}
