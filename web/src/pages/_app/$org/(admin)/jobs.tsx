import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  Pause,
  Play,
  Send,
  Square,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  getListUsersByOrgQueryOptions,
  useGetJobs,
  usePostJobsJobKeyRun,
  usePostJobsJobKeyStart,
  usePostJobsJobKeyStop,
  usePostOrgSlugJobsSendMonthlySummary,
} from '@/api/generated/api'
import type { ListUsersByOrg200UsersItem } from '@/api/generated/model'
import type { GetJobs200JobsItem } from '@/api/generated/model/getJobs200JobsItem'
import { LoadingErrorState } from '@/components/loading-error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { http } from '@/lib/http'

interface ExecutionEntry {
  timestamp: string
  success: boolean
  processed: number
  errors: number
  duration: number
}

interface HistoryData {
  jobKey: string
  lastRun: ExecutionEntry | null
  history: ExecutionEntry[]
}

interface NextRunData {
  jobKey: string
  nextRun: string
  schedule: string
  scheduleHuman: string
  timezone: string
}

interface PreviewTransaction {
  id: string
  title: string
  amount: number
  dueDate: string
  daysUntilDue: number
  alertType: 'warning' | 'urgent' | 'overdue'
  ownerName: string
  ownerPhone: string
  payToName: string | null
  payToPhone: string | null
}

interface PreviewOverdueTransaction {
  id: string
  title: string
  amount: number
  dueDate: string
  overdueDays: number
  payToName: string | null
  payToPhone: string | null
  organizationSlug: string
  installmentInfo: string | null
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAmount(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function useJobHistory(jobKey: string) {
  return useQuery({
    queryKey: ['job-history', jobKey],
    queryFn: () => http<HistoryData>(`/jobs/${jobKey}/history`, { method: 'GET' }),
    enabled: !!jobKey,
  })
}

function useJobNextRun(jobKey: string) {
  return useQuery({
    queryKey: ['job-next-run', jobKey],
    queryFn: () => http<NextRunData>(`/jobs/${jobKey}/next-run`, { method: 'GET' }),
    enabled: !!jobKey,
  })
}

function JobCard({
  job,
  users,
  onRun,
  onStop,
  onStart,
  loadingKey,
}: {
  job: GetJobs200JobsItem
  users: ListUsersByOrg200UsersItem[]
  onRun: (key: string, userId?: string) => void
  onStop: (key: string) => void
  onStart: (key: string) => void
  loadingKey: string | null
}) {
  const [showHistory, setShowHistory] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedPreviewUser, setSelectedPreviewUser] = useState('')
  const [previewData, setPreviewData] = useState<{
    type: 'alerts' | 'overdue'
    transactions: PreviewTransaction[]
    summary: { total: number; today: number; tomorrow: number; twoDays: number; threeToFourDays: number }
  } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const { data: historyData } = useJobHistory(job.key)
  const { data: nextRunData } = useJobNextRun(job.key)

  const isAlertJob = job.key === 'transactions:alerts'
  const isOverdueJob = job.key === 'transactions:overdue-alerts'
  const needsUser = isAlertJob || isOverdueJob

  const handlePreview = async () => {
    setLoadingPreview(true)
    try {
      if (isAlertJob) {
        const url = selectedPreviewUser
          ? `/jobs/transactions:alerts/preview?userId=${encodeURIComponent(selectedPreviewUser)}`
          : '/jobs/transactions:alerts/preview'
        const data = await http<{ preview: { transactions: PreviewTransaction[]; summary: { total: number; today: number; tomorrow: number; twoDays: number; threeToFourDays: number } } }>(url, { method: 'GET' })
        setPreviewData({ type: 'alerts', transactions: data.preview.transactions, summary: data.preview.summary })
      } else if (isOverdueJob) {
        const url = selectedPreviewUser
          ? `/jobs/overdue-alerts/preview?userId=${encodeURIComponent(selectedPreviewUser)}`
          : '/jobs/overdue-alerts/preview'
        const data = await http<{ preview: { transactions: PreviewOverdueTransaction[]; summary: { total: number; overdue: number } } }>(url, { method: 'GET' })
        setPreviewData({
          type: 'overdue',
          transactions: data.preview.transactions.map(t => ({
            id: t.id,
            title: t.title,
            amount: t.amount,
            dueDate: t.dueDate,
            daysUntilDue: -t.overdueDays,
            alertType: 'overdue' as const,
            ownerName: t.payToName || 'Desconhecido',
            ownerPhone: t.payToPhone || '',
            payToName: t.payToName,
            payToPhone: t.payToPhone,
          })),
          summary: { total: data.preview.summary.total, today: 0, tomorrow: 0, twoDays: 0, threeToFourDays: 0 },
        })
      }
      setShowPreview(true)
    } catch {
      toast.error('Erro ao carregar preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const lastRun = historyData?.lastRun
  const hasHistory = lastRun || (historyData?.history.length ?? 0) > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${job.isRunning ? 'bg-green-500' : 'bg-red-400'}`} />
            <div>
              <CardTitle className="text-base">{job.config.description}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono">{job.key}</p>
            </div>
          </div>
          <Badge variant={job.isRunning ? 'default' : 'outline'} className={job.isRunning ? 'bg-green-600' : ''}>
            {job.isRunning ? 'Ativo' : 'Pausado'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Schedule info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Agendamento</span>
            <p className="font-medium">{nextRunData?.scheduleHuman ?? job.config.schedule}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Próxima execução</span>
            <p className="font-medium">{nextRunData?.nextRun ?? '—'}</p>
          </div>
        </div>

        {/* Last execution */}
        <div className="text-sm border-t pt-3">
          <span className="text-muted-foreground">Última execução</span>
          {lastRun ? (
            <p className="font-medium flex items-center gap-2">
              <span className={lastRun.success ? 'text-green-600' : 'text-red-600'}>
                {lastRun.success ? '✅' : '❌'}
              </span>
              {formatDate(lastRun.timestamp)}
              <span className="text-muted-foreground">
                • {lastRun.processed} proc. • {lastRun.errors} erros • {formatDuration(lastRun.duration)}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">Nunca executado</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {needsUser && (
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Selecione usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            size="sm"
            variant="default"
            onClick={() => onRun(job.key, selectedUser || undefined)}
            disabled={loadingKey === job.key || (needsUser && !selectedUser)}
            className="h-8 text-xs"
          >
            {loadingKey === job.key ? (
              <Square className="mr-1 h-3 w-3" />
            ) : (
              <Play className="mr-1 h-3 w-3" />
            )}
            Executar agora
          </Button>

          {needsUser && (
            <>
              <Select value={selectedPreviewUser} onValueChange={setSelectedPreviewUser}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Usuário (preview)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreview}
                disabled={loadingPreview}
                className="h-8 text-xs"
              >
                <Eye className="mr-1 h-3 w-3" />
                Preview
              </Button>
            </>
          )}

          {job.isRunning ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStop(job.key)}
              disabled={loadingKey === job.key}
              className="h-8 text-xs"
            >
              <Pause className="mr-1 h-3 w-3" />
              Pausar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStart(job.key)}
              disabled={loadingKey === job.key}
              className="h-8 text-xs"
            >
              <Play className="mr-1 h-3 w-3" />
              Ativar
            </Button>
          )}
        </div>

        {/* Preview expandable */}
        {showPreview && previewData && (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                Preview — {previewData.type === 'alerts' ? 'Alertas' : 'Vencidas'}
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-muted rounded p-1.5">
                <span className="font-bold">{previewData.summary.total}</span>
                <p className="text-muted-foreground">Total</p>
              </div>
              {previewData.type === 'alerts' ? (
                <>
                  <div className="bg-red-100 dark:bg-red-950/30 rounded p-1.5">
                    <span className="font-bold text-red-600">{previewData.summary.today}</span>
                    <p className="text-muted-foreground">Hoje</p>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-950/30 rounded p-1.5">
                    <span className="font-bold text-orange-600">{previewData.summary.tomorrow}</span>
                    <p className="text-muted-foreground">Amanhã</p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-950/30 rounded p-1.5">
                    <span className="font-bold text-yellow-600">{previewData.summary.twoDays}</span>
                    <p className="text-muted-foreground">2 dias</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-950/30 rounded p-1.5">
                    <span className="font-bold text-gray-600">{previewData.summary.threeToFourDays}</span>
                    <p className="text-muted-foreground">3-4 dias</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-red-100 dark:bg-red-950/30 rounded p-1.5 col-span-4">
                    <span className="font-bold text-red-600">{previewData.summary.total}</span>
                    <p className="text-muted-foreground">vencidas</p>
                  </div>
                </>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {previewData.transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                  <span className="truncate flex-1">{t.title}</span>
                  <span className="text-muted-foreground ml-2">{formatAmount(t.amount)}</span>
                  <span className="text-muted-foreground ml-2 w-14 text-right">
                    {t.daysUntilDue === 0 ? 'Hoje' : t.daysUntilDue < 0 ? `-${-t.daysUntilDue}d` : `${t.daysUntilDue}d`}
                  </span>
                </div>
              ))}
              {previewData.transactions.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  ... e mais {previewData.transactions.length - 10} itens
                </p>
              )}
            </div>
          </div>
        )}

        {/* History expandable */}
        {hasHistory && (
          <div className="border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs w-full justify-start"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
              <History className="mr-1 h-3 w-3" />
              Histórico
            </Button>
            {showHistory && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {(historyData?.history ?? []).slice(0, 5).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                    <span className={entry.success ? 'text-green-600' : 'text-red-600'}>
                      {entry.success ? '✅' : '❌'}
                    </span>
                    <span className="text-muted-foreground">{formatDate(entry.timestamp)}</span>
                    <span>{entry.processed} proc.</span>
                    <span>{formatDuration(entry.duration)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function JobsPage() {
  const { slug } = useActiveOrganization()
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [selectedMonthlyUser, setSelectedMonthlyUser] = useState('')
  const [sendingMonthly, setSendingMonthly] = useState(false)

  const { data: jobs, isLoading, error, refetch } = useGetJobs()
  const { data: usersData } = useQuery(getListUsersByOrgQueryOptions(slug))
  const runJobMutation = usePostJobsJobKeyRun()
  const stopJobMutation = usePostJobsJobKeyStop()
  const startJobMutation = usePostJobsJobKeyStart()
  const sendMonthlySummary = usePostOrgSlugJobsSendMonthlySummary()

  const users = usersData?.users ?? []

  const SYSTEM_JOBS = ['transactions:materialize']
  const visibleJobs = jobs?.jobs.filter(j => !SYSTEM_JOBS.includes(j.key)) ?? []
  const activeJobs = visibleJobs.filter(j => j.isRunning).length
  const totalJobs = visibleJobs.length

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

  const handleRun = async (jobKey: string, userId?: string) => {
    setLoadingKey(jobKey)
    try {
      const result = await runJobMutation.mutateAsync({ jobKey, data: userId ? { userId } : {} })
      if (result.result?.success) {
        toast.success(`Executado! ${result.result.processed} processados`)
      } else {
        toast.error(`Erros: ${result.result?.errors}`)
      }
      refetch()
    } catch {
      toast.error('Erro ao executar job')
    } finally {
      setLoadingKey(null)
    }
  }

  const handleStop = async (jobKey: string) => {
    setLoadingKey(jobKey)
    try {
      await stopJobMutation.mutateAsync({ jobKey })
      toast.success('Job pausado')
      refetch()
    } catch {
      toast.error('Erro ao pausar')
    } finally {
      setLoadingKey(null)
    }
  }

  const handleStart = async (jobKey: string) => {
    setLoadingKey(jobKey)
    try {
      await startJobMutation.mutateAsync({ jobKey })
      toast.success('Job ativado')
      refetch()
    } catch {
      toast.error('Erro ao ativar')
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <LoadingErrorState
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      title="Erro ao carregar jobs"
      description="Não foi possível carregar a lista de jobs."
    >
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header */}
          <div className="px-4 lg:px-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Controle de Jobs</h1>
              <p className="text-muted-foreground">
                Monitore e execute jobs manualmente — independente do agendamento
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 lg:px-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jobs ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <span className="text-green-600">{activeJobs}</span>
                    <span className="text-muted-foreground">/{totalJobs}</span>
                    <span className="text-sm font-normal text-muted-foreground ml-2">ativos</span>
                  </div>
                </CardContent>
              </Card>

              {visibleJobs[0] && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Próxima execução</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JobNextRunInline jobKey={visibleJobs[0].key} fallback="—" />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Monthly summary - quick send card */}
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Enviar resumo do mês anterior</CardTitle>
              </CardHeader>
              <CardContent>
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
          </div>

          {/* Job Cards */}
          <div className="px-4 lg:px-6">
            <div className="grid gap-4">
              {visibleJobs.map(job => (
                <JobCard
                  key={job.key}
                  job={job}
                  users={users}
                  onRun={handleRun}
                  onStop={handleStop}
                  onStart={handleStart}
                  loadingKey={loadingKey}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </LoadingErrorState>
  )
}

function JobNextRunInline({ jobKey, fallback }: { jobKey: string; fallback: string }) {
  const { data } = useJobNextRun(jobKey)
  return (
    <>
      <div className="text-xs text-muted-foreground">{data?.scheduleHuman ?? jobKey}</div>
      <div className="text-sm font-bold">{data?.nextRun ?? fallback}</div>
    </>
  )
}

export const Route = createFileRoute('/_app/$org/(admin)/jobs')({
  component: JobsPage,
})
