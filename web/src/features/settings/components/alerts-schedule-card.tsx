import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import {
  getAlertSettings,
  parseTimeInputValue,
  toTimeInputValue,
  updateAlertSettings,
} from '../api/alert-settings'

export function AlertsScheduleCard() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const [timeValue, setTimeValue] = useState('09:00')

  const { data, isLoading } = useQuery({
    queryKey: ['alert-settings', slug],
    queryFn: () => getAlertSettings(slug!),
    enabled: !!slug,
  })

  const { mutateAsync: saveSettings, isPending } = useMutation({
    mutationFn: (value: string) => {
      const parsed = parseTimeInputValue(value)
      if (!parsed) {
        throw new Error('invalid-time')
      }
      return updateAlertSettings(slug!, parsed)
    },
    onSuccess: saved => {
      queryClient.setQueryData(['alert-settings', slug], saved)
      toast.success('Horário dos alertas atualizado')
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

  const handleSave = async () => {
    if (!slug) return
    await saveSettings(timeValue)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horário dos alertas</CardTitle>
        <CardDescription>
          Define quando os alertas automáticos são criados (fuso {data?.timezone ?? 'America/Sao_Paulo'}
          ). O WhatsApp é enviado logo depois.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="alert-notify-time">Horário diário</Label>
            <div className="relative max-w-[160px]">
              <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="alert-notify-time"
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
            onClick={handleSave}
          >
            Salvar horário
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Padrão: 09:00. Ex.: com &quot;1d&quot; na regra, o alerta do vencimento de amanhã será
          criado hoje às {timeValue || '09:00'}.
        </p>
      </CardContent>
    </Card>
  )
}
