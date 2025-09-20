import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Square,
  StopCircle,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  useGetJobs,
  useGetJobsStats,
  usePostJobsJobKeyRun,
  usePostJobsJobKeyStart,
  usePostJobsJobKeyStop,
  usePostJobsStartAll,
  usePostJobsStopAll,
} from '@/api/generated/api'
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
import { Separator } from '@/components/ui/separator'

function JobsPage() {
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set())
  const [stoppingJobs, setStoppingJobs] = useState<Set<string>>(new Set())
  const [startingJobs, setStartingJobs] = useState<Set<string>>(new Set())
  const [showStopAllModal, setShowStopAllModal] = useState(false)

  const { data: jobs, isLoading, error, refetch } = useGetJobs()
  const { data: stats } = useGetJobsStats()
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
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Alertas de Vencimento</span>
            </div>
            <div className="pl-6 space-y-1 text-sm text-muted-foreground">
              <p>• Envia alertas para transações próximas do vencimento</p>
              <p>• Executa 3x por dia: 09:00, 15:00 e 21:00</p>
              <p>• Alertas urgentes (hoje/amanhã): sempre envia</p>
              <p>• Alertas de 2 dias: apenas às 09:00</p>
              <p>• Lembretes (3-4 dias): apenas às 09:00 em dias pares</p>
              <p>• Mensagens personalizadas com nome do destinatário</p>
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Controle de Jobs</h1>
                  <p className="text-muted-foreground">
                    Monitore e execute jobs do sistema manualmente
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={handleStartAllJobs}
                    disabled={startAllJobsMutation.isPending}
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

            {/* Lista de Jobs */}
            <div className="px-4 lg:px-6">
              <div className="grid gap-4">
                {jobs?.jobs.map(job => (
                  <Card key={job.key}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(job.isRunning)}
                          <div>
                            <CardTitle className="text-lg">{job.config.description}</CardTitle>
                            <CardDescription className="font-mono text-sm">
                              {job.key}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.isRunning)}
                          {job.isRunning ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStopJob(job.key)}
                                disabled={stoppingJobs.has(job.key)}
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
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleStartJob(job.key)}
                              disabled={startingJobs.has(job.key)}
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
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Agendamento</p>
                          <p className="font-mono text-sm">{job.config.schedule}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                          <p className="text-sm">{job.config.timezone}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                          <p className="text-sm">{formatUptime(job.uptime)}</p>
                        </div>
                      </div>

                      {/* Informações específicas do job */}
                      <Separator className="my-4" />
                      <div className="space-y-3">{getJobSpecificInfo(job.key)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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
