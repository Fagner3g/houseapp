import { Clock, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useGetJobsJobKeyHistory, useGetJobsJobKeyNextRun } from '@/api/generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { readHttpErrorMessage } from '@/lib/http'

import {
  listManualAlertTargets,
  type ManualAlertTarget,
} from '../api/list-manual-alert-targets'
import { sendManualAlert, type ManualAlertType } from '../api/send-manual-alert'

const JOB_EVALUATE = 'alerts:evaluate'
const JOB_WHATSAPP = 'alerts:send-whatsapp'

function formatLastRun(timestamp: string | undefined, processed: number, errors: number) {
  if (!timestamp) return 'Nunca executado'
  const when = new Date(timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return `${when} · ${processed} processados · ${errors} erros`
}

const MANUAL_ACTIONS: {
  type: ManualAlertType
  label: string
  description: string
}[] = [
  {
    type: 'overdue',
    label: 'Vencidas',
    description: 'Envia por WhatsApp todos os lançamentos vencidos do membro',
  },
  {
    type: 'upcoming',
    label: 'Prestes a vencer',
    description: 'Envia por WhatsApp todos os lançamentos pendentes do membro (ignora regras de dias)',
  },
  {
    type: 'monthly-summary',
    label: 'Relatório completo',
    description: 'Envia o resumo financeiro do mês para o telefone do membro',
  },
]

export function AlertsOperationsCard() {
  const { slug } = useActiveOrganization()
  const [targetKey, setTargetKey] = useState('')
  const [targets, setTargets] = useState<ManualAlertTarget[]>([])
  const [runningAction, setRunningAction] = useState<string | null>(null)

  const { data: evaluateNext } = useGetJobsJobKeyNextRun(JOB_EVALUATE)
  const { data: whatsappNext } = useGetJobsJobKeyNextRun(JOB_WHATSAPP)
  const { data: evaluateHistory } = useGetJobsJobKeyHistory(JOB_EVALUATE)

  useEffect(() => {
    if (!slug) {
      setTargets([])
      return
    }

    let cancelled = false

    listManualAlertTargets(slug)
      .then(response => {
        if (!cancelled) {
          setTargets(response.targets)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTargets([])
          toast.error('Não foi possível carregar membros e contatos para envio manual')
        }
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  const selectedTarget = targets.find(target => target.key === targetKey)
  const isContactTarget = selectedTarget?.type === 'contact'

  const runManualAlert = async (type: ManualAlertType, label: string) => {
    if (!slug || !targetKey) {
      toast.error('Selecione um membro ou contato')
      return
    }

    if (type === 'monthly-summary' && isContactTarget) {
      toast.error('Relatório completo disponível apenas para membros')
      return
    }

    setRunningAction(label)
    try {
      const result = await sendManualAlert(slug, targetKey, type)
      const targetName = selectedTarget?.name ?? 'destinatário'

      if (result.sent === 0) {
        toast.message(`${label}: nenhuma mensagem enviada para ${targetName}`)
      } else if (result.errors > 0) {
        toast.warning(
          `${label}: ${result.sent} enviada(s), ${result.errors} erro(s) para ${targetName}`
        )
      } else {
        toast.success(`${label}: ${result.sent} mensagem(ns) enviada(s) para ${targetName}`)
      }
    } catch (error) {
      const message = await readHttpErrorMessage(
        error,
        `Erro ao enviar ${label.toLowerCase()}`
      )
      toast.error(message)
    } finally {
      setRunningAction(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automação e ações manuais</CardTitle>
        <CardDescription>
          Envie alertas manualmente por membro ou contato de divisão. O envio manual ignora regras de
          dias e inclui todos os lançamentos pendentes ou vencidos do destinatário. Os alertas
          automáticos respeitam o horário configurado acima.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">Avaliação de alertas</p>
            <p className="mt-1 flex items-center gap-1.5 text-slate-600">
              <Clock className="size-3.5" />
              Próxima: {evaluateNext?.nextRun ?? '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Última:{' '}
              {formatLastRun(
                evaluateHistory?.lastRun?.timestamp,
                evaluateHistory?.lastRun?.processed ?? 0,
                evaluateHistory?.lastRun?.errors ?? 0
              )}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">Envio WhatsApp</p>
            <p className="mt-1 flex items-center gap-1.5 text-slate-600">
              <Clock className="size-3.5" />
              Próxima: {whatsappNext?.nextRun ?? '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Processa a fila de notificações WhatsApp pendentes dos alertas automáticos
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Envio manual por membro</p>
          <div className="min-w-[200px] max-w-sm">
            <Select value={targetKey} onValueChange={setTargetKey}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um membro ou contato" />
              </SelectTrigger>
              <SelectContent>
                {targets.map(target => (
                  <SelectItem key={target.key} value={target.key}>
                    {target.type === 'contact' ? `${target.name} (contato)` : target.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {MANUAL_ACTIONS.map(action => (
              <Button
                key={action.type}
                type="button"
                variant="outline"
                disabled={
                  !!runningAction ||
                  !targetKey ||
                  (action.type === 'monthly-summary' && isContactTarget)
                }
                onClick={() => runManualAlert(action.type, action.label)}
              >
                <Send className="mr-1.5 size-4" />
                {action.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {MANUAL_ACTIONS.map(action => action.description).join(' · ')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
