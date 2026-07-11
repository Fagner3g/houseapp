import { Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { readHttpErrorMessage } from '@/lib/http'

import { listManualAlertTargets } from '../api/list-manual-alert-targets'
import { sendManualAlert, type ManualAlertType } from '../api/send-manual-alert'

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
    description:
      'Envia por WhatsApp todos os lançamentos pendentes do membro (ignora regras de dias)',
  },
  {
    type: 'monthly-summary',
    label: 'Relatório completo',
    description: 'Envia o resumo financeiro do mês para o telefone do membro',
  },
]

export function AlertsManualSendCard() {
  const { slug } = useActiveOrganization()
  const [targetKey, setTargetKey] = useState('')
  const [runningAction, setRunningAction] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['manual-alert-targets', slug],
    queryFn: () => listManualAlertTargets(slug as string),
    enabled: !!slug,
  })

  const targets = data?.targets ?? []
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
      toast.error(await readHttpErrorMessage(error, `Erro ao enviar ${label.toLowerCase()}`))
    } finally {
      setRunningAction(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Envio manual</CardTitle>
        <CardDescription>
          Envie lembretes por WhatsApp para um membro ou contato. Ignora regras de dias.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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

        <div className="flex flex-wrap gap-2">
          {MANUAL_ACTIONS.map(action => {
            const disabled =
              !!runningAction ||
              !targetKey ||
              (action.type === 'monthly-summary' && isContactTarget)

            return (
              <Tooltip key={action.type}>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => void runManualAlert(action.type, action.label)}
                    >
                      <Send className="mr-1.5 size-4" />
                      {action.label}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{action.description}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
