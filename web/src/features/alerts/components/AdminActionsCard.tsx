import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, Send, Square } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  getListUsersByOrgQueryOptions,
  usePostJobsJobKeyRun,
  usePostOrgSlugJobsSendMonthlySummary,
} from '@/api/generated/api'
import { recentDeliveriesKey } from '@/features/alerts/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALERTS_EVALUATE_JOB_KEY = 'alerts:evaluate'

type AdminActionsCardProps = {
  slug: string
}

export function AdminActionsCard({ slug }: AdminActionsCardProps) {
  const queryClient = useQueryClient()
  const [runningAlerts, setRunningAlerts] = useState(false)
  const [selectedMonthlyUser, setSelectedMonthlyUser] = useState('')
  const [sendingMonthly, setSendingMonthly] = useState(false)

  const { data: usersData } = useQuery(getListUsersByOrgQueryOptions(slug))
  const runJobMutation = usePostJobsJobKeyRun()
  const sendMonthlySummary = usePostOrgSlugJobsSendMonthlySummary()

  const users = usersData?.users ?? []

  const handleRunAlerts = async () => {
    setRunningAlerts(true)
    try {
      const result = await runJobMutation.mutateAsync({
        jobKey: ALERTS_EVALUATE_JOB_KEY,
        data: {},
      })
      if (result.result?.success) {
        toast.success(`Alertas executados! ${result.result.processed} processados`)
        await queryClient.invalidateQueries({ queryKey: recentDeliveriesKey(slug) })
      } else {
        toast.error(`Erros: ${result.result?.errors ?? 'falha na execução'}`)
      }
    } catch {
      toast.error('Erro ao executar alertas')
    } finally {
      setRunningAlerts(false)
    }
  }

  const handleSendMonthly = async () => {
    if (!slug || !selectedMonthlyUser) return
    setSendingMonthly(true)
    try {
      await sendMonthlySummary.mutateAsync({ slug, data: { userId: selectedMonthlyUser } })
      toast.success('Resumo do mês anterior enviado!')
    } catch {
      toast.error('Erro ao enviar resumo')
    } finally {
      setSendingMonthly(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <CardTitle className="text-base">Ações administrativas</CardTitle>
        <Button
          size="sm"
          onClick={handleRunAlerts}
          disabled={runningAlerts}
          className="h-8 shrink-0 text-xs"
        >
          {runningAlerts ? (
            <Square className="mr-1 h-3 w-3" />
          ) : (
            <Play className="mr-1 h-3 w-3" />
          )}
          Executar alertas agora
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm font-medium">Enviar resumo do mês anterior</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMonthlyUser} onValueChange={setSelectedMonthlyUser}>
            <SelectTrigger className="w-56 h-8 text-xs">
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} {u.phone ? `(${u.phone})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleSendMonthly}
            disabled={!selectedMonthlyUser || sendingMonthly}
            className="h-8 text-xs"
          >
            {sendingMonthly ? (
              <Square className="mr-1 h-3 w-3" />
            ) : (
              <Send className="mr-1 h-3 w-3" />
            )}
            Enviar resumo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
