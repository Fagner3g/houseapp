import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Play,
  Square,
  StopCircle,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  getListUsersByOrgQueryOptions,
  useGetJobs,
  useGetJobsStats,
  usePostJobsJobKeyRun,
  usePostJobsJobKeyStart,
  usePostJobsJobKeyStop,
  usePostJobsStartAll,
  usePostJobsStopAll,
  usePostOrgSlugJobsSendMonthlySummary,
} from '@/api/generated/api'
import type { ListUsersByOrg200UsersItem } from '@/api/generated/model'
import { LoadingErrorState } from '@/components/loading-error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { http } from '@/lib/http'

function JobsPage() {
  const { slug } = useActiveOrganization()
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set())
  const [stoppingJobs, setStoppingJobs] = useState<Set<string>>(new Set())
  const [startingJobs, setStartingJobs] = useState<Set<string>>(new Set())
  const [showStopAllModal, setShowStopAllModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isSendingMonthly, setIsSendingMonthly] = useState(false)
  const [previewData, setPreviewData] = useState<{
    transactions: Array<{
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
    }>
    summary: {
      total: number
      today: number
      tomorrow: number
      twoDays: number
      threeToFourDays: number
    }
  } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const { data: jobs, isLoading, error, refetch } = useGetJobs()
  const { data: stats } = useGetJobsStats()
  const { data: usersData } = useQuery(getListUsersByOrgQueryOptions(slug))
  const sendMonthlySummary = usePostOrgSlugJobsSendMonthlySummary()
  const runJobMutation = usePostJobsJobKeyRun()
  const startJobMutation = usePostJobsJobKeyStart()
  const stopJobMutation = usePostJobsJobKeyStop()
  const stopAllJobsMutation = usePostJobsStopAll()
  const startAllJobsMutation = usePostJobsStartAll()

  const handleRunJob = async (jobKey: string) => {
    setRunningJobs(prev => new Set(prev).add(jobKey))

    try {
      const result = await runJobMutation.mutateAsync({ jobKey })

      if (result.result?.success) {
        toast.success(`Job executado com sucesso! Processados: ${result.result.processed}`)
      } else {
        toast.error(`Job executado com erros. Erros: ${result.result?.errors}`)
      }

      // Atualizar a lista de jobs
      refetch()
    } catch {
      toast.error('Erro ao executar job')
    } finally {
      setRunningJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobKey)
        return newSet
      })
    }
  }

  const handleStopAllJobs = () => {
    setShowStopAllModal(true)
  }

  const handleStartJob = async (jobKey: string) => {
    setStartingJobs(prev => new Set(prev).add(jobKey))

    try {
      await startJobMutation.mutateAsync({ jobKey })
      toast.success(`Job '${jobKey}' foi iniciado com sucesso!`)
      // Atualizar a lista de jobs
      refetch()
    } catch {
      toast.error('Erro ao iniciar job')
    } finally {
      setStartingJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobKey)
        return newSet
      })
    }
  }

  const handleStopJob = async (jobKey: string) => {
    setStoppingJobs(prev => new Set(prev).add(jobKey))

    try {
      await stopJobMutation.mutateAsync({ jobKey })
      toast.success(`Job '${jobKey}' foi parado com sucesso!`)
      // Atualizar a lista de jobs
      refetch()
    } catch {
      toast.error('Erro ao parar job')
    } finally {
      setStoppingJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobKey)
        return newSet
      })
    }
  }

  const handleStartAllJobs = async () => {
    try {
      await startAllJobsMutation.mutateAsync()
      toast.success('Todos os jobs foram iniciados com sucesso!')
      // Atualizar a lista de jobs
      refetch()
    } catch {
      toast.error('Erro ao iniciar jobs')
    }
  }

  const confirmStopAllJobs = async () => {
    try {
      await stopAllJobsMutation.mutateAsync()
      toast.success('Todos os jobs foram parados com sucesso!')
      setShowStopAllModal(false)
      // Atualizar a lista de jobs
      refetch()
    } catch {
      toast.error('Erro ao parar jobs')
    }
  }

  const handleSendMonthlySummary = async () => {
    if (!slug || !selectedUserId) return
    try {
      setIsSendingMonthly(true)
      await sendMonthlySummary.mutateAsync({ slug, data: { userId: selectedUserId } })
      toast.success('Resumo mensal enviado via WhatsApp')
    } catch {
      toast.error('Erro ao enviar resumo mensal')
    } finally {
      setIsSendingMonthly(false)
    }
  }

  const handlePreviewAlerts = async () => {
    setLoadingPreview(true)
    try {
      const data = await http<{
        preview: {
          transactions: Array<{
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
          }>
          summary: {
            total: number
            today: number
            tomorrow: number
            twoDays: number
            threeToFourDays: number
          }
        }
      }>('/jobs/transactions:alerts/preview', {
        method: 'GET',
      })
      setPreviewData(data.preview)
      setShowPreviewModal(true)
    } catch (error) {
      console.error('Erro ao carregar preview:', error)
      toast.error('Erro ao carregar preview dos alertas')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handlePreviewOverdueAlerts = async () => {
    setLoadingPreview(true)
    try {
      const data = await http<{
        preview: {
          transactions: Array<{
            id: string
            title: string
            amount: number
            dueDate: string
            overdueDays: number
            payToName: string | null
            payToPhone: string | null
            organizationSlug: string
            installmentInfo: string | null
          }>
          summary: {
            total: number
            overdue: number
          }
        }
      }>('/jobs/overdue-alerts/preview', {
        method: 'GET',
      })
      setPreviewData({
        transactions: data.preview.transactions.map(t => ({
          id: t.id,
          title: t.title,
          amount: t.amount,
          dueDate: t.dueDate,
          daysUntilDue: -t.overdueDays, // Negativo para indicar vencida
          alertType: 'overdue' as const,
          ownerName: t.payToName || 'Desconhecido',
          ownerPhone: t.payToPhone || '',
          payToName: t.payToName,
          payToPhone: t.payToPhone,
        })),
        summary: {
          total: data.preview.summary.total,
          today: 0,
          tomorrow: 0,
          twoDays: 0,
          threeToFourDays: 0,
        },
      })
      setShowPreviewModal(true)
    } catch (error) {
      console.error('Erro ao carregar preview dos alertas vencidas:', error)
      toast.error('Erro ao carregar preview dos alertas vencidas')
    } finally {
      setLoadingPreview(false)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`
    return `${(ms / 3600000).toFixed(1)}h`
  }

  const formatUptime = (ms?: number) => {
    if (!ms) return 'N/A'
    return formatDuration(ms)
  }

  const getJobSpecificInfo = (jobKey: string) => {
    switch (jobKey) {
      case 'reports:all-owners':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Relatórios de Transações</span>
            </div>
            <div className="pl-6 space-y-1 text-sm text-muted-foreground">
              <p>• Envia relatórios mensais para todos os proprietários</p>
              <p>• Executa no dia 5 de cada mês às 10:00</p>
              <p>• Inclui resumo de transações do mês anterior</p>
              <p>• Envia via WhatsApp para cada proprietário</p>
            </div>
          </div>
        )

      case 'reports:owner-digest':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Digest para Proprietários</span>
            </div>
            <div className="pl-6 space-y-1 text-sm text-muted-foreground">
              <p>• Consolida informações de todos os proprietários</p>
              <p>• Executa no dia 5 de cada mês às 10:00</p>
              <p>• Gera resumo executivo das finanças</p>
              <p>• Envia relatório consolidado</p>
            </div>
          </div>
        )

      case 'transactions:materialize':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Materialização de Ocorrências</span>
            </div>
            <div className="pl-6 space-y-1 text-sm text-muted-foreground">
              <p>• Cria ocorrências futuras de transações recorrentes</p>
              <p>• Executa diariamente às 03:00</p>
              <p>• Garante que transações futuras estejam disponíveis</p>
              <p>• Processa séries mensais, semanais e anuais</p>
            </div>
          </div>
        )

      case 'transactions:alerts':
        return (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Alertas de Vencimento</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreviewAlerts}
                disabled={loadingPreview}
                className="w-full sm:w-auto"
              >
                {loadingPreview ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
            </div>
            <div className="pl-6 space-y-1 text-sm text-muted-foreground">
              <p>• Envia alertas para transações próximas do vencimento</p>
              <p>• Executa diariamente às 09:00</p>
              <p>• Busca transações que vencem em até 4 dias</p>
              <p>• Alertas críticos para vencimentos hoje/amanhã</p>
              <p>• Lembretes para vencimentos em 2-4 dias</p>
              <p>• Mensagens personalizadas com nome do destinatário</p>
            </div>
          </div>
        )

      case 'transactions:overdue-alerts':
        return (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Alertas de Transações Vencidas</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreviewOverdueAlerts}
                disabled={loadingPreview}
                className="w-full sm:w-auto"
              >
                {loadingPreview ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
            </div>
            <div className="pl-6 space-y-1 text-sm text-muted-foreground">
              <p>• Envia alertas especificamente para transações vencidas</p>
              <p>• Executa todo dia 1º do mês às 10:00</p>
              <p>• Foco em transações que já passaram do vencimento</p>
              <p>• Lembretes urgentes para pagamentos em atraso</p>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Job Personalizado</span>
            </div>
            <div className="pl-6 space-y-1 text-sm text-muted-foreground">
              <p>• Job configurado para execução automática</p>
              <p>• Verifique a documentação para mais detalhes</p>
            </div>
          </div>
        )
    }
  }

  const getStatusIcon = (isRunning: boolean) => {
    if (isRunning) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (isRunning: boolean) => {
    if (isRunning) {
      return (
        <Badge variant="default" className="bg-green-500">
          Ativo
        </Badge>
      )
    }
    return <Badge variant="secondary">Inativo</Badge>
  }

  return (
    <LoadingErrorState
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      title="Erro ao carregar jobs"
      description="Não foi possível carregar a lista de jobs. Tente novamente."
    >
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Header */}
            <div className="px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Controle de Jobs
                  </h1>
                  <p className="text-muted-foreground">
                    Monitore e execute jobs do sistema manualmente
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="default"
                    onClick={handleStartAllJobs}
                    disabled={startAllJobsMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {startAllJobsMutation.isPending ? (
                      <>
                        <Square className="mr-2 h-4 w-4" />
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Iniciar Todos
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleStopAllJobs}
                    disabled={stopAllJobsMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {stopAllJobsMutation.isPending ? (
                      <>
                        <Square className="mr-2 h-4 w-4" />
                        Parando...
                      </>
                    ) : (
                      <>
                        <StopCircle className="mr-2 h-4 w-4" />
                        Parar Todos
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Estatísticas do Sistema */}
            {stats && (
              <div className="px-4 lg:px-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Jobs</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.stats.totalJobs}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Jobs Ativos</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {stats.stats.runningJobs}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatUptime(stats.stats.uptime)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Status</CardTitle>
                      {stats.stats.isInitialized ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.stats.isInitialized ? 'Inicializado' : 'Pendente'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Ação manual: Enviar resumo mensal por WhatsApp */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle>Enviar resumo mensal</CardTitle>
                  <CardDescription>
                    Envie um resumo do mês para um usuário específico via WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    <Label>Usuário</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Select
                        value={selectedUserId ?? ''}
                        onValueChange={v => setSelectedUserId(v)}
                      >
                        <SelectTrigger className="sm:w-72">
                          <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                        <SelectContent>
                          {(usersData?.users ?? []).map((u: ListUsersByOrg200UsersItem) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} {u.phone ? `(${u.phone})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleSendMonthlySummary}
                        disabled={!selectedUserId || isSendingMonthly}
                      >
                        {isSendingMonthly ? 'Enviando...' : 'Enviar resumo'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Jobs */}
            <div className="px-4 lg:px-6">
              <div className="grid gap-4">
                {jobs?.jobs.map(job => (
                  <Card key={job.key}>
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(job.isRunning)}
                          <div>
                            <CardTitle className="text-base sm:text-lg">
                              {job.config.description}
                            </CardTitle>
                            <CardDescription className="font-mono text-xs sm:text-sm">
                              {job.key}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          {getStatusBadge(job.isRunning)}
                          {job.isRunning ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStopJob(job.key)}
                                disabled={stoppingJobs.has(job.key)}
                                className="flex-1 sm:flex-none"
                              >
                                {stoppingJobs.has(job.key) ? (
                                  <>
                                    <Square className="mr-2 h-4 w-4" />
                                    Parando...
                                  </>
                                ) : (
                                  <>
                                    <StopCircle className="mr-2 h-4 w-4" />
                                    Parar
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleRunJob(job.key)}
                                disabled={runningJobs.has(job.key)}
                                className="flex-1 sm:flex-none"
                              >
                                {runningJobs.has(job.key) ? (
                                  <>
                                    <Square className="mr-2 h-4 w-4" />
                                    Executando...
                                  </>
                                ) : (
                                  <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Executar
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleStartJob(job.key)}
                              disabled={startingJobs.has(job.key)}
                              className="w-full sm:w-auto"
                            >
                              {startingJobs.has(job.key) ? (
                                <>
                                  <Square className="mr-2 h-4 w-4" />
                                  Iniciando...
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Iniciar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Agendamento</p>
                          <p className="font-mono text-xs sm:text-sm break-all">
                            {job.config.schedule}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                          <p className="text-xs sm:text-sm">{job.config.timezone}</p>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                          <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                          <p className="text-xs sm:text-sm">{formatUptime(job.uptime)}</p>
                        </div>
                      </div>

                      {/* Informações específicas do job */}
                      <Separator className="my-4" />
                      <div className="space-y-3">{getJobSpecificInfo(job.key)}</div>

                      {/* Removido: UI de enviar resumo por job */}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de preview dos alertas */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Preview dos Alertas de Transação
            </DialogTitle>
            <DialogDescription>
              Visualize as transações que seriam processadas pelo job de alertas
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {previewData.summary.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{previewData.summary.today}</div>
                  <div className="text-sm text-muted-foreground">Hoje</div>
                </div>
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {previewData.summary.tomorrow}
                  </div>
                  <div className="text-sm text-muted-foreground">Amanhã</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {previewData.summary.twoDays}
                  </div>
                  <div className="text-sm text-muted-foreground">2 dias</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {previewData.summary.threeToFourDays}
                  </div>
                  <div className="text-sm text-muted-foreground">3-4 dias</div>
                </div>
              </div>

              {/* Lista de transações */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Transações que serão processadas:</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {previewData.transactions.map(transaction => (
                    <div key={transaction.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              transaction.alertType === 'urgent' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}
                          />
                          <h4 className="font-medium">{transaction.title}</h4>
                          <span className="text-sm text-muted-foreground">
                            R$ {transaction.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              transaction.alertType === 'urgent' ? 'destructive' : 'secondary'
                            }
                          >
                            {transaction.alertType === 'urgent' ? 'Urgente' : 'Aviso'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {transaction.daysUntilDue === 0
                              ? 'Hoje'
                              : transaction.daysUntilDue === 1
                                ? 'Amanhã'
                                : `${transaction.daysUntilDue} dias`}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Proprietário:</span>
                          <div className="font-medium">{transaction.ownerName}</div>
                          <div className="text-muted-foreground">{transaction.ownerPhone}</div>
                        </div>
                        {transaction.payToName && (
                          <div>
                            <span className="text-muted-foreground">Responsável:</span>
                            <div className="font-medium">{transaction.payToName}</div>
                            <div className="text-muted-foreground">{transaction.payToPhone}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação para parar todos os jobs */}
      <Dialog open={showStopAllModal} onOpenChange={setShowStopAllModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StopCircle className="h-5 w-5 text-red-500" />
              Parar Todos os Jobs
            </DialogTitle>
            <DialogDescription>
              Esta ação irá parar TODOS os jobs do sistema. Isso pode afetar:
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Relatórios automáticos
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Materialização de ocorrências
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Outros processos agendados
              </li>
            </ul>

            <div className="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-950/20">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                ⚠️ Esta ação não pode ser desfeita automaticamente
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStopAllModal(false)}
              disabled={stopAllJobsMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmStopAllJobs}
              disabled={stopAllJobsMutation.isPending}
            >
              {stopAllJobsMutation.isPending ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Parando...
                </>
              ) : (
                <>
                  <StopCircle className="mr-2 h-4 w-4" />
                  Parar Todos os Jobs
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LoadingErrorState>
  )
}

export const Route = createFileRoute('/_app/$org/(admin)/jobs')({
  component: JobsPage,
})
