import { createFileRoute, useSearch } from '@tanstack/react-router'
import {
  AlertCircle,
  BriefcaseBusiness,
  Calendar,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  LineChart as LineChartIcon,
  Plus,
  Target,
  Wallet,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'

import {
  type InvestmentAsset,
  type InvestmentDashboard,
  type InvestmentPlan,
  useCreateInvestmentAsset,
  useCreateInvestmentExecution,
  useCreateInvestmentPlan,
  useDeleteInvestmentAsset,
  useDeleteInvestmentExecution,
  useDeleteInvestmentPlan,
  useInvestmentAssets,
  useInvestmentDashboard,
  useInvestmentPlans,
  useInvestmentQuotePreview,
  useSetInvestmentQuote,
  useUpdateInvestmentAsset,
  useUpdateInvestmentExecution,
  useUpdateInvestmentPlan,
} from '@/features/investments/api'
import { AiChatPanel } from '@/components/investments/ai-chat-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const Route = createFileRoute('/_app/investments')({
  component: InvestmentsPage,
})

type AssetFormState = {
  symbol: string
  displayName: string
  assetClass: string
  quotePreference: InvestmentAsset['quotePreference']
  manualPrice: number
  notes: string
}

type PlanFormState = {
  assetId: string
  mode: InvestmentPlan['mode']
  progressionType: InvestmentPlan['progressionType']
  initialValue: string
  stepValue: string
  startDate: string
  endDate: string
}

type ExecutionFormState = {
  assetId: string
  planId: string
  referenceMonth: string
  investedAmount: string
  executedQuantity: string
  executedUnitPrice: string
  executedAt: string
}

const assetClassOptions = ['Ação', 'FII', 'ETF', 'BDR', 'Renda fixa', 'Cripto', 'Fundo']

// Ativos comprados em unidades inteiras → só faz sentido planejar por quantidade
const QUANTITY_ONLY_CLASSES = ['Ação', 'FII', 'ETF', 'BDR']
// Ativos investidos por valor (cotas fracionadas) → só faz sentido planejar por valor
const AMOUNT_ONLY_CLASSES = ['Fundo', 'Renda fixa']

function getRequiredPlanMode(assetClass: string): 'quantity' | 'amount' | null {
  if (QUANTITY_ONLY_CLASSES.includes(assetClass)) return 'quantity'
  if (AMOUNT_ONLY_CLASSES.includes(assetClass)) return 'amount'
  return null // Cripto: qualquer modo
}

function defaultAssetForm(): AssetFormState {
  return {
    symbol: '',
    displayName: '',
    assetClass: 'Ação',
    quotePreference: 'auto_with_manual_fallback',
    manualPrice: 0,
    notes: '',
  }
}

function defaultPlanForm(): PlanFormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    assetId: '',
    mode: 'amount',
    progressionType: 'fixed',
    initialValue: '',
    stepValue: '0',
    startDate: today,
    endDate: '',
  }
}

function defaultExecutionForm(): ExecutionFormState {
  const today = new Date()
  return {
    assetId: '',
    planId: '',
    referenceMonth: today.toISOString().slice(0, 7),
    investedAmount: '',
    executedQuantity: '',
    executedUnitPrice: '',
    executedAt: today.toISOString().slice(0, 10),
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatQuantity(value: number) {
  if (Number.isInteger(value)) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

function quantityLabelForAssetClass(assetClass: string) {
  const normalized = assetClass.trim().toLowerCase()
  if (normalized === 'ação' || normalized === 'bdr') return 'Total de ações'
  if (normalized === 'fii' || normalized === 'fundo') return 'Total de cotas'
  if (normalized === 'cripto') return 'Total em carteira'
  return 'Quantidade total'
}

function formatDateTime(value?: string | null) {
  if (!value) return null

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDate(value?: string | null) {
  if (!value) return ''

  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`))
}

function _formatMonthLabel(value?: string | null) {
  if (!value) return ''

  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}

function parseCurrencyString(value?: string) {
  if (!value) return 0
  const normalized = Number(String(value).replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : 0
}

function calculateInvestedAmount(quantity?: string, unitPrice?: string) {
  const quantityNumber = Number(quantity ?? '')
  const unitPriceNumber = parseCurrencyString(unitPrice)

  if (!Number.isFinite(quantityNumber) || quantityNumber <= 0 || unitPriceNumber <= 0) {
    return ''
  }

  return (quantityNumber * unitPriceNumber).toFixed(2)
}

const monthOptions = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

function stepStatusLabel(completed: boolean, current: boolean) {
  if (completed) return 'Concluída'
  if (current) return 'Atual'
  return 'Próxima'
}

function InvestmentsPage() {
  const noPlanValue = '__none__'
  const search = useSearch({ strict: false }) as {
    action?: string
    assetId?: string
    planId?: string
    referenceMonth?: string
  }
  const { data: dashboard, isLoading: dashboardLoading } = useInvestmentDashboard()
  const { data: assets = [] } = useInvestmentAssets()
  const { data: plans = [] } = useInvestmentPlans()

  const createAsset = useCreateInvestmentAsset()
  const updateAsset = useUpdateInvestmentAsset()
  const deleteAsset = useDeleteInvestmentAsset()
  const setQuote = useSetInvestmentQuote()
  const createPlan = useCreateInvestmentPlan()
  const updatePlan = useUpdateInvestmentPlan()
  const deletePlan = useDeleteInvestmentPlan()
  const createExecution = useCreateInvestmentExecution()
  const updateExecution = useUpdateInvestmentExecution()
  const deleteExecution = useDeleteInvestmentExecution()

  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<InvestmentAsset | null>(null)
  const [assetForm, setAssetForm] = useState<AssetFormState>(defaultAssetForm())
  const [quotePreviewSymbol, setQuotePreviewSymbol] = useState('')
  const [assetToDelete, setAssetToDelete] = useState<InvestmentAsset | null>(null)

  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null)
  const [planForm, setPlanForm] = useState<PlanFormState>(defaultPlanForm())
  const [planToDelete, setPlanToDelete] = useState<InvestmentPlan | null>(null)

  const [executionDialogOpen, setExecutionDialogOpen] = useState(false)
  const [executionForm, setExecutionForm] = useState<ExecutionFormState>(defaultExecutionForm())
  const [editingExecution, setEditingExecution] = useState<InvestmentDashboard['recentExecutions'][number] | null>(null)

  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [quoteAsset, setQuoteAsset] = useState<InvestmentAsset | null>(null)
  const [quotePrice, setQuotePrice] = useState('')
  const [executionToDelete, setExecutionToDelete] = useState<InvestmentDashboard['recentExecutions'][number] | null>(null)
  const [onboardingDialogOpen, setOnboardingDialogOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardStepVisible, setWizardStepVisible] = useState(1)
  const [wizardStepAnimating, setWizardStepAnimating] = useState(false)
  const deepLinkHandledRef = useRef(false)
  const { data: quotePreview, isFetching: isCheckingQuote } = useInvestmentQuotePreview(
    quotePreviewSymbol,
    assetForm.assetClass || undefined,
    assetDialogOpen || onboardingDialogOpen
  )

  function openCreateAsset() {
    setEditingAsset(null)
    setAssetForm(defaultAssetForm())
    setQuotePreviewSymbol('')
    setAssetDialogOpen(true)
  }

  function openEditAsset(asset: InvestmentAsset) {
    setEditingAsset(asset)
    setAssetForm({
      symbol: asset.symbol,
      displayName: asset.displayName,
      assetClass: asset.assetClass,
      quotePreference: asset.quotePreference,
      manualPrice: (asset.quotePreference === 'manual' || asset.quotePreference === 'auto_with_manual_fallback') && asset.currentPriceSource === 'manual' && asset.currentPrice ? asset.currentPrice : 0,
      notes: asset.notes,
    })
    setQuotePreviewSymbol(asset.symbol)
    setAssetDialogOpen(true)
  }

  function openCreatePlan() {
    setEditingPlan(null)
    const firstAsset = assets[0]
    const forcedMode = firstAsset ? getRequiredPlanMode(firstAsset.assetClass) : null
    setPlanForm({
      ...defaultPlanForm(),
      assetId: firstAsset?.id ?? '',
      ...(forcedMode ? { mode: forcedMode } : {}),
    })
    setPlanDialogOpen(true)
  }

  function openEditPlan(plan: InvestmentPlan) {
    setEditingPlan(plan)
    const planAsset = assets.find(a => a.id === plan.assetId)
    const forcedMode = planAsset ? getRequiredPlanMode(planAsset.assetClass) : null
    setPlanForm({
      assetId: plan.assetId,
      mode: forcedMode ?? plan.mode,
      progressionType: plan.progressionType,
      initialValue: String(plan.mode === 'amount' ? (plan.initialAmount ?? '') : (plan.initialQuantity ?? '')),
      stepValue: String(plan.mode === 'amount' ? (plan.stepAmount ?? 0) : (plan.stepQuantity ?? 0)),
      startDate: plan.startDate.slice(0, 10),
      endDate: plan.endDate?.slice(0, 10) ?? '',
    })
    setPlanDialogOpen(true)
  }

  function hasDuplicateAssetSymbol(symbol: string, currentAssetId?: string) {
    const normalized = symbol.trim().toUpperCase()
    if (!normalized) return false

    return assets.some(asset => asset.symbol.toUpperCase() === normalized && asset.id !== currentAssetId)
  }

  const duplicateAssetSymbol = hasDuplicateAssetSymbol(assetForm.symbol, editingAsset?.id)

  async function handleSaveAsset() {
    if (hasDuplicateAssetSymbol(assetForm.symbol, editingAsset?.id)) {
      toast.error('Já existe um ativo com esse ticker na sua carteira')
      return
    }

    if (assetForm.quotePreference === 'manual' && !assetForm.manualPrice) {
      toast.error('Informe o preço manual para este ativo')
      return
    }


    try {
      let assetId: string

      if (editingAsset) {
        await updateAsset.mutateAsync({ assetId: editingAsset.id, ...assetForm })
        assetId = editingAsset.id
        toast.success('Ativo atualizado')
      } else {
        const created = await createAsset.mutateAsync(assetForm) as { asset: { id: string } }
        assetId = created.asset.id
        toast.success('Ativo criado')
      }

      // Salvar cotação manual junto ao ativo, se aplicável
      if (
        (assetForm.quotePreference === 'manual' || assetForm.quotePreference === 'auto_with_manual_fallback') &&
        assetForm.manualPrice
      ) {
        await setQuote.mutateAsync({ assetId, price: String(assetForm.manualPrice) })
      }

      setAssetDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar ativo')
    }
  }

  useEffect(() => {
    if (!assetDialogOpen && !onboardingDialogOpen) return

    const symbol = assetForm.symbol.trim().toUpperCase()
    if (!symbol) {
      setQuotePreviewSymbol('')
      return
    }

    const timeoutId = window.setTimeout(() => {
      setQuotePreviewSymbol(symbol)
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [assetDialogOpen, onboardingDialogOpen, assetForm.symbol])

  useEffect(() => {
    if (!assetDialogOpen && !onboardingDialogOpen) return
    if (!quotePreview) return
    if (quotePreview.supported) return

    setAssetForm(prev => {
      if (prev.quotePreference === 'manual') return prev
      return { ...prev, quotePreference: 'manual' }
    })
  }, [assetDialogOpen, onboardingDialogOpen, quotePreview])

  useEffect(() => {
    setExecutionForm(prev => {
      const investedAmount = calculateInvestedAmount(prev.executedQuantity, prev.executedUnitPrice)
      if (prev.investedAmount === investedAmount) return prev
      return { ...prev, investedAmount }
    })
  }, [])

  useEffect(() => {
    if (!executionDialogOpen) return
    if (!executionForm.assetId) return

    const selectedAsset = assets.find(asset => asset.id === executionForm.assetId)
    const lastExecution = dashboard?.recentExecutions.find(e => e.assetId === executionForm.assetId)

    setExecutionForm(prev => {
      if (prev.executedUnitPrice) return prev
      const price = lastExecution?.executedUnitPrice ?? selectedAsset?.currentPrice
      if (!price) return prev
      return { ...prev, executedUnitPrice: String(price) }
    })
  }, [executionDialogOpen, executionForm.assetId, assets, dashboard?.recentExecutions])

  async function handleSavePlan() {
    const payload =
      planForm.mode === 'amount'
        ? {
            assetId: planForm.assetId,
            mode: planForm.mode,
            progressionType: planForm.progressionType,
            initialAmount: planForm.initialValue,
            stepAmount: planForm.progressionType === 'linear_step' ? planForm.stepValue : '0',
            startDate: planForm.startDate,
            endDate: planForm.endDate || undefined,
          }
        : {
            assetId: planForm.assetId,
            mode: planForm.mode,
            progressionType: planForm.progressionType,
            initialQuantity: Number(planForm.initialValue),
            stepQuantity: planForm.progressionType === 'linear_step' ? Number(planForm.stepValue) : 0,
            startDate: planForm.startDate,
            endDate: planForm.endDate || undefined,
          }

    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({ planId: editingPlan.id, ...payload })
        toast.success('Plano atualizado')
      } else {
        await createPlan.mutateAsync(payload)
        toast.success('Plano criado')
      }

      setPlanDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar plano')
    }
  }

  async function handleFinishWizard(save: 'asset' | 'asset_plan' | 'asset_plan_execution') {
    if (hasDuplicateAssetSymbol(assetForm.symbol)) {
      toast.error('Já existe um ativo com esse ticker na sua carteira')
      return
    }

    try {
      const assetResponse = await createAsset.mutateAsync(assetForm) as { asset?: { id?: string } }
      const createdAssetId = assetResponse?.asset?.id
      if (!createdAssetId) throw new Error('Asset creation failed')

      if (save === 'asset') {
        toast.success('Ativo criado')
        setOnboardingDialogOpen(false)
        setWizardStep(1)
        setAssetForm(defaultAssetForm())
        setPlanForm(defaultPlanForm())
        setExecutionForm(defaultExecutionForm())
        return
      }

      const planPayload =
        planForm.mode === 'amount'
          ? {
              assetId: createdAssetId,
              mode: planForm.mode,
              progressionType: planForm.progressionType,
              initialAmount: planForm.initialValue,
              stepAmount: planForm.progressionType === 'linear_step' ? planForm.stepValue : '0',
              startDate: planForm.startDate,
              endDate: planForm.endDate || undefined,
            }
          : {
              assetId: createdAssetId,
              mode: planForm.mode,
              progressionType: planForm.progressionType,
              initialQuantity: Number(planForm.initialValue),
              stepQuantity: planForm.progressionType === 'linear_step' ? Number(planForm.stepValue) : 0,
              startDate: planForm.startDate,
              endDate: planForm.endDate || undefined,
            }

      const planResponse = await createPlan.mutateAsync(planPayload) as { plan?: { id?: string } }
      const createdPlanId = planResponse?.plan?.id

      if (save === 'asset_plan') {
        toast.success('Ativo e plano criados')
        setOnboardingDialogOpen(false)
        setWizardStep(1)
        setAssetForm(defaultAssetForm())
        setPlanForm(defaultPlanForm())
        setExecutionForm(defaultExecutionForm())
        return
      }

      await createExecution.mutateAsync({
        assetId: createdAssetId,
        planId: createdPlanId || undefined,
        referenceMonth: executionForm.referenceMonth,
        investedAmount: executionForm.investedAmount,
        executedQuantity: Number(executionForm.executedQuantity),
        executedUnitPrice: executionForm.executedUnitPrice,
        executedAt: executionForm.executedAt,
      })
      toast.success('Carteira inicial criada')
      setOnboardingDialogOpen(false)
      setWizardStep(1)
      setAssetForm(defaultAssetForm())
      setPlanForm(defaultPlanForm())
      setExecutionForm(defaultExecutionForm())
    } catch {
      toast.error('Erro ao finalizar cadastro guiado')
    }
  }

  async function handleRegisterExecution() {
    try {
      const payload = {
        assetId: executionForm.assetId,
        planId: executionForm.planId || undefined,
        referenceMonth: executionForm.referenceMonth,
        investedAmount: executionForm.investedAmount,
        executedQuantity: Number(executionForm.executedQuantity),
        executedUnitPrice: executionForm.executedUnitPrice,
        executedAt: executionForm.executedAt,
      }

      if (editingExecution) {
        await updateExecution.mutateAsync({
          executionId: editingExecution.id,
          ...payload,
        })
        toast.success('Aporte atualizado')
      } else {
        await createExecution.mutateAsync(payload)
        toast.success('Aporte registrado')
      }

      setExecutionDialogOpen(false)
      setEditingExecution(null)
      setExecutionForm(defaultExecutionForm())
    } catch {
      toast.error(editingExecution ? 'Erro ao atualizar aporte' : 'Erro ao registrar aporte')
    }
  }

  async function handleDeleteAsset(asset: InvestmentAsset) {
    try {
      await deleteAsset.mutateAsync(asset.id)
      toast.success('Ativo removido')
    } catch {
      toast.error('Erro ao remover ativo')
    }
  }

  async function handleDeletePlan(plan: InvestmentPlan) {
    try {
      await deletePlan.mutateAsync(plan.id)
      toast.success('Plano removido')
    } catch {
      toast.error('Erro ao remover plano')
    }
  }

  async function handleDeleteExecution(executionId: string) {
    try {
      await deleteExecution.mutateAsync(executionId)
      toast.success('Aporte removido')
    } catch {
      toast.error('Erro ao remover aporte')
    }
  }

  function openEditExecution(execution: InvestmentDashboard['recentExecutions'][number]) {
    setEditingExecution(execution)
    setExecutionForm({
      assetId: execution.assetId,
      planId: execution.planId ?? '',
      referenceMonth: execution.referenceMonth,
      investedAmount: String(execution.investedAmount),
      executedQuantity: String(execution.executedQuantity),
      executedUnitPrice: String(execution.executedUnitPrice),
      executedAt: execution.executedAt.slice(0, 10),
    })
    setExecutionDialogOpen(true)
  }

  async function handleSaveQuote() {
    if (!quoteAsset) return

    try {
      await setQuote.mutateAsync({ assetId: quoteAsset.id, price: quotePrice })
      toast.success('Cotação manual salva')
      setQuoteDialogOpen(false)
      setQuoteAsset(null)
      setQuotePrice('')
    } catch {
      toast.error('Erro ao salvar cotação')
    }
  }

  function openOnboardingWizard() {
    setAssetForm(defaultAssetForm())
    setQuotePreviewSymbol('')
    setPlanForm({
      ...defaultPlanForm(),
      assetId: '',
    })
    setExecutionForm(defaultExecutionForm())
    setWizardStep(1)
    setWizardStepVisible(1)
    setWizardStepAnimating(false)
    setOnboardingDialogOpen(true)
  }

  function goToWizardStep(nextStep: number) {
    if (nextStep === wizardStep) return

    setWizardStepAnimating(true)
    window.setTimeout(() => {
      setWizardStep(nextStep)
      setWizardStepVisible(nextStep)
      setWizardStepAnimating(false)
    }, 140)
  }

  useEffect(() => {
    if (deepLinkHandledRef.current) return
    if (search.action !== 'register') return
    if (!assets.length) return

    deepLinkHandledRef.current = true

    const matchedAsset = assets.find(asset => asset.id === search.assetId) ?? assets[0]
    const matchedPlan = plans.find(plan => plan.id === search.planId)

    setEditingExecution(null)
    setExecutionForm({
      assetId: matchedAsset?.id ?? '',
      planId: matchedPlan?.id ?? '',
      referenceMonth: search.referenceMonth ?? new Date().toISOString().slice(0, 7),
      investedAmount: '',
      executedQuantity: '',
      executedUnitPrice: matchedAsset?.currentPrice ? String(matchedAsset.currentPrice) : '',
      executedAt: new Date().toISOString().slice(0, 10),
    })
    setExecutionDialogOpen(true)
  }, [assets, plans, search.action, search.assetId, search.planId, search.referenceMonth])

  if (dashboardLoading || !dashboard) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando carteira...</div>
  }


  return (
    <div className="space-y-6 p-4 lg:p-6">
      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="xl:col-span-2 border-dashed bg-muted/20">
          <CardHeader>
            <CardTitle>Como começar</CardTitle>
            <CardDescription>
              Um fluxo único para cadastrar o ativo, criar o plano e registrar o primeiro aporte dentro do mesmo modal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Use o cadastro guiado</p>
              <p className="text-sm text-muted-foreground">
                O modal conduz as 3 etapas em sequência: ativo, plano e aporte.
              </p>
            </div>
            <Button onClick={openOnboardingWizard}>
              <Wallet className="size-4" />
              Começar passo a passo
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-emerald-500/12 via-background to-sky-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              Carteira pessoal
            </CardTitle>
            <CardDescription>
              Acompanhe patrimônio, aportes do mês e a projeção simples dos próximos 12 meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total investido" value={formatCurrency(dashboard.summary.totalInvested)} />
            <MetricCard title="Valor atual" value={formatCurrency(dashboard.summary.currentValue)} />
            <MetricCard
              title="Rendimento"
              value={formatCurrency(dashboard.summary.yieldAmount)}
              helper={formatPercent(dashboard.summary.yieldPercent)}
            />
            <MetricCard
              title="Pendências do mês"
              value={String(dashboard.summary.pendingThisMonth)}
              helper={`${formatCurrency(dashboard.summary.investedThisMonth)} aportado`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5" />
              Próximos aportes
            </CardTitle>
            <CardDescription>
              Itens ainda não executados no mês corrente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.pending.length ? (
              dashboard.pending.slice(0, 12).map(item => {
                const asset = assets.find(a => a.id === item.assetId)
                return (
                  <button
                    key={`${item.planId}-${item.referenceMonth}`}
                    type="button"
                    className="group w-full cursor-pointer rounded-lg border p-3 text-left transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm active:scale-[0.99]"
                    onClick={() => {
                      const lastExecution = dashboard.recentExecutions.find(e => e.assetId === item.assetId)
                      const price = lastExecution?.executedUnitPrice ?? asset?.currentPrice
                      setEditingExecution(null)
                      setExecutionForm({
                        ...defaultExecutionForm(),
                        assetId: item.assetId,
                        planId: item.planId,
                        referenceMonth: item.referenceMonth,
                        executedUnitPrice: price ? String(price) : '',
                        executedQuantity: item.plannedQuantity ? String(item.plannedQuantity) : '',
                      })
                      setExecutionDialogOpen(true)
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium transition-colors group-hover:text-primary">{item.assetSymbol}</p>
                          <span className="text-xs text-muted-foreground capitalize">
                            {new Date(`${item.referenceMonth}-01`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.plannedAmount
                            ? `${formatCurrency(item.plannedAmount)} planejado`
                            : `${item.plannedQuantity} unidade(s) planejadas`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.status === 'overdue' ? 'destructive' : 'secondary'}>
                          {item.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                        </Badge>
                        <span className="translate-x-0 text-xs text-primary opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100">
                          Executar →
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum aporte pendente neste mês.</p>
            )}
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                setEditingExecution(null)
                setExecutionForm(defaultExecutionForm())
                setExecutionDialogOpen(true)
              }}
            >
              Registrar aporte
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="size-5" />
              Projeção de 12 meses
            </CardTitle>
            <CardDescription>
              Barras: aporte mensal planejado. Linha: valor projetado acumulado (cotação estática).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dashboard.projection} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickFormatter={month => {
                    const [y, m] = month.split('-')
                    return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. de ', '/').replace('.', '')
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickFormatter={value => {
                    const n = Number(value)
                    if (n >= 1000) return `R$ ${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
                    return `R$ ${n.toFixed(0)}`
                  }}
                  width={70}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const [y, m] = (label as string).split('-')
                    const monthLabel = new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                    return (
                      <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
                        <p className="mb-2 text-xs font-semibold capitalize text-foreground">{monthLabel}</p>
                        {payload.map(entry => (
                          <div key={entry.dataKey as string} className="flex items-center gap-2 text-xs">
                            <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium text-foreground">{formatCurrency(entry.value as number)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={value => <span style={{ color: '#a1a1aa' }}>{value}</span>}
                />
                <ReferenceLine
                  x={new Date().toISOString().slice(0, 7)}
                  stroke="rgba(255,255,255,0.2)"
                  strokeDasharray="4 4"
                  label={{ value: 'Hoje', position: 'top', fontSize: 10, fill: '#71717a' }}
                />
                <Bar
                  dataKey="plannedAmount"
                  name="Aporte do mês"
                  fill="#10b981"
                  opacity={0.5}
                  radius={[2, 2, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="projectedMarketValue"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  name="Valor projetado"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execuções recentes</CardTitle>
            <CardDescription>Últimos aportes registrados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentExecutions.length ? (
              dashboard.recentExecutions.map(item => {
                const [year, month] = item.referenceMonth.split('-')
                const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleDateString(
                  'pt-BR',
                  { month: 'long', year: 'numeric' }
                )
                return (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium capitalize">{monthLabel}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(item.investedAmount)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.executedQuantity} un. &middot; {formatCurrency(item.executedUnitPrice)}/un.
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditExecution(item)}>
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setExecutionToDelete(item)}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum aporte registrado ainda.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="size-5" />
                  Ativos
                </CardTitle>
                <CardDescription>Posição atual, preço médio e rendimento por ativo.</CardDescription>
              </div>
              <Button onClick={openCreateAsset}>
                <Plus />
                Novo ativo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {assets.length ? (
              assets.map(asset => (
                <div key={asset.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{asset.symbol}</p>
                        <Badge variant="outline">{asset.assetClass}</Badge>
                        {asset.currentPriceSource === 'auto' ? (
                          <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/10">
                            Via API
                          </Badge>
                        ) : (
                          <Badge variant="default">Manual</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{asset.displayName}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditAsset(asset)}>
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuoteAsset(asset)
                          setQuotePrice(String(asset.currentPrice || ''))
                          setQuoteDialogOpen(true)
                        }}
                      >
                        Cotação
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setAssetToDelete(asset)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MiniMetric
                      label={quantityLabelForAssetClass(asset.assetClass)}
                      value={formatQuantity(asset.quantity)}
                      help="Total acumulado que você possui atualmente nesse ativo, considerando os aportes já registrados."
                    />
                    <MiniMetric
                      label="Preço médio"
                      value={formatCurrency(asset.averagePrice)}
                      helper={
                        asset.currentPrice && asset.averagePrice
                          ? asset.currentPrice >= asset.averagePrice
                            ? `Cotação ${formatCurrency(asset.currentPrice)} ↑`
                            : `Cotação ${formatCurrency(asset.currentPrice)} ↓`
                          : undefined
                      }
                      helperVariant={
                        asset.currentPrice && asset.averagePrice
                          ? asset.currentPrice >= asset.averagePrice
                            ? 'positive'
                            : 'negative'
                          : undefined
                      }
                      help="Preço médio pago por unidade com base nos aportes registrados. A cotação atual é mostrada ao lado para facilitar a comparação."
                    />
                    <MiniMetric
                      label="Valor total da posição"
                      value={formatCurrency(asset.marketValue)}
                      helper={
                        asset.currentPriceSource === 'auto'
                          ? `${formatCurrency(asset.currentPrice)}${asset.currentPriceCapturedAt ? ` • ${formatDateTime(asset.currentPriceCapturedAt)}` : ''}`
                          : `${formatCurrency(asset.currentPrice)} manual`
                      }
                      help={`Valor estimado da posição: ${formatQuantity(asset.quantity)} × ${formatCurrency(asset.currentPrice)} (cotação atual). Total investido: ${formatCurrency(asset.totalInvested)}.`}
                    />
                    <MiniMetric
                      label="Rendimento"
                      value={`${asset.yieldAmount >= 0 ? '+' : ''}${formatCurrency(asset.yieldAmount)} (${formatPercent(asset.yieldPercent)})`}
                      variant={asset.yieldAmount >= 0 ? 'positive' : 'negative'}
                      help="Diferença entre o valor atual da posição e o total já investido nesse ativo. Pode ser positivo (lucro) ou negativo (prejuízo)."
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum ativo cadastrado.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-5" />
                  Planejamento recorrente
                </CardTitle>
                <CardDescription>
                  Defina aportes fixos ou progressivos por valor ou quantidade.
                </CardDescription>
              </div>
              <Button onClick={openCreatePlan} disabled={!assets.length}>
                <Plus />
                Novo plano
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.length ? (
              plans.map(plan => (
                <div key={plan.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{plan.assetSymbol}</p>
                        <Badge variant="outline">
                          {plan.mode === 'amount' ? 'Por valor' : 'Por quantidade'}
                        </Badge>
                        <Badge variant="outline">
                          {plan.progressionType === 'linear_step' ? 'Linear' : 'Fixo'}
                        </Badge>
                        <Badge variant={plan.active ? 'secondary' : 'outline'}>
                          {plan.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Início: {formatDate(plan.startDate.slice(0, 10))}
                        {plan.endDate ? ` • Encerra: ${formatDate(plan.endDate.slice(0, 10))}` : ' • Sem encerramento'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditPlan(plan)}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setPlanToDelete(plan)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniMetric
                      label={plan.mode === 'amount' ? 'Valor inicial' : 'Quantidade inicial'}
                      value={
                        plan.mode === 'amount'
                          ? formatCurrency(plan.initialAmount ?? 0)
                          : `${plan.initialQuantity ?? 0} un.`
                      }
                    />
                    {plan.progressionType === 'linear_step' && (
                      <MiniMetric
                        label="Incremento mensal"
                        value={
                          plan.mode === 'amount'
                            ? formatCurrency(plan.stepAmount ?? 0)
                            : `${plan.stepQuantity ?? 0} un.`
                        }
                      />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum plano criado. Cadastre um ativo e depois defina a recorrência.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Editar ativo' : 'Novo ativo'}</DialogTitle>
            <DialogDescription>
              Cadastre um ativo genérico e escolha como a cotação deve ser resolvida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldHelp
                label="Classe do ativo"
                help="Categoria usada para organizar a carteira, como Ação, FII, ETF ou Renda fixa."
              />
              <Select
                value={assetForm.assetClass}
                onValueChange={value => setAssetForm(prev => ({ ...prev, assetClass: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Classe do ativo" />
                </SelectTrigger>
                <SelectContent>
                  {assetClassOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FieldHelp
                label="Ticker"
                help="Código do ativo, como VALE3, PETR4 ou MXRF11."
              />
              <Input
                placeholder="Ticker"
                value={assetForm.symbol}
                onChange={e =>
                  setAssetForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))
                }
              />
              {duplicateAssetSymbol ? (
                <div className="flex items-center gap-2 text-xs text-amber-500">
                  <AlertCircle className="size-3.5" />
                  Já existe um ativo com esse ticker na sua carteira.
                </div>
              ) : null}
              {assetForm.symbol.trim() ? (
                <div className="flex items-center gap-2 text-xs">
                  {isCheckingQuote ? (
                    <span className="text-muted-foreground">Testando cotação automática...</span>
                  ) : quotePreview ? (
                    <>
                      <span
                        className={
                          quotePreview.supported ? 'text-emerald-500' : 'text-amber-500'
                        }
                      >
                        {quotePreview.message}
                      </span>
                      {quotePreview.supported && quotePreview.price != null ? (
                        <Badge variant="secondary">
                          {formatCurrency(quotePreview.price)}
                        </Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <AlertCircle className="size-3.5" />
                          Manual recomendado
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            <Input
              placeholder="Nome do ativo"
              value={assetForm.displayName}
              onChange={e => setAssetForm(prev => ({ ...prev, displayName: e.target.value }))}
            />
            <div className="space-y-2">
              <FieldHelp
                label="Tipo de cotação"
                help="Define de onde vem o preço atual do ativo: automático, manual ou automático com fallback manual."
              />
              <Select
                value={assetForm.quotePreference}
                onValueChange={value =>
                  setAssetForm(prev => ({
                    ...prev,
                    quotePreference: value as AssetFormState['quotePreference'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Preferência de cotação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="auto_with_manual_fallback"
                    disabled={quotePreview?.supported === false}
                  >
                    Automática com fallback manual
                  </SelectItem>
                  <SelectItem value="auto" disabled={quotePreview?.supported === false}>
                    Automática
                  </SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              {(assetForm.quotePreference === 'manual' || assetForm.quotePreference === 'auto_with_manual_fallback') && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {assetForm.quotePreference === 'manual'
                      ? 'Preço manual obrigatório — será usado como cotação do ativo.'
                      : 'Preço de fallback (opcional) — usado se a cotação automática falhar.'}
                  </p>
                  <CurrencyInput
                    value={assetForm.manualPrice}
                    onValueChange={value => setAssetForm(prev => ({ ...prev, manualPrice: value }))}
                  />
                </div>
              )}
            </div>
            <Textarea
              placeholder="Observações"
              value={assetForm.notes}
              onChange={e => setAssetForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAsset}
              isLoading={createAsset.isPending || updateAsset.isPending}
              disabled={duplicateAssetSymbol}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar plano' : 'Novo plano'}</DialogTitle>
            <DialogDescription>
              Defina recorrência mensal por valor ou quantidade, com opção fixa ou progressão linear.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldHelp label="Ativo" help="Ativo que receberá os aportes planejados neste plano." />
              <Select
                value={planForm.assetId}
                onValueChange={value => {
                  const asset = assets.find(a => a.id === value)
                  const forcedMode = asset ? getRequiredPlanMode(asset.assetClass) : null
                  setPlanForm(prev => ({
                    ...prev,
                    assetId: value,
                    ...(forcedMode ? { mode: forcedMode } : {}),
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ativo" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.symbol} • {asset.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const selectedAsset = assets.find(a => a.id === planForm.assetId)
              const forcedMode = selectedAsset ? getRequiredPlanMode(selectedAsset.assetClass) : null
              return forcedMode ? (
                <p className="text-xs text-muted-foreground">
                  {forcedMode === 'quantity'
                    ? `${selectedAsset?.assetClass} é comprado em unidades inteiras — modo fixado em quantidade.`
                    : `${selectedAsset?.assetClass} é investido por valor — modo fixado em valor mensal.`}
                </p>
              ) : null
            })()}
            <div className="grid gap-4 md:grid-cols-2">
              {(() => {
                const selectedAsset = assets.find(a => a.id === planForm.assetId)
                const forcedMode = selectedAsset ? getRequiredPlanMode(selectedAsset.assetClass) : null
                return (
                  <div className="space-y-2">
                    <FieldHelp
                      label="Modo"
                      help="Valor mensal: define quanto investir em reais. Quantidade mensal: define quantas cotas comprar."
                    />
                    <Select
                      value={planForm.mode}
                      disabled={!!forcedMode}
                      onValueChange={value => setPlanForm(prev => ({ ...prev, mode: value as PlanFormState['mode'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Modo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Valor mensal</SelectItem>
                        <SelectItem value="quantity">Quantidade mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )
              })()}
              <div className="space-y-2">
                <FieldHelp
                  label="Progressão"
                  help="Fixo: mesmo valor todo mês. Linear: aumenta gradualmente pelo incremento definido."
                />
                <Select
                  value={planForm.progressionType}
                  onValueChange={value =>
                    setPlanForm(prev => ({ ...prev, progressionType: value as PlanFormState['progressionType'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Progressão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixo</SelectItem>
                    <SelectItem value="linear_step">Linear</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={`grid gap-4 ${planForm.progressionType === 'linear_step' ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              <div className="space-y-2">
                <FieldHelp
                  label={planForm.mode === 'amount' ? 'Valor inicial' : 'Quantidade inicial'}
                  help={planForm.mode === 'amount' ? 'Valor em reais do primeiro aporte.' : 'Número de cotas do primeiro aporte.'}
                />
                <Input
                  placeholder={planForm.mode === 'amount' ? 'Ex.: 100.00' : (() => {
                    const a = assets.find(x => x.id === planForm.assetId)
                    return a?.assetClass === 'Cripto' ? 'Ex.: 0.001' : 'Ex.: 5'
                  })()}
                  value={planForm.initialValue}
                  onChange={e => setPlanForm(prev => ({ ...prev, initialValue: e.target.value }))}
                />
              </div>
              {planForm.progressionType === 'linear_step' && (
                <div className="space-y-2">
                  <FieldHelp
                    label="Incremento mensal"
                    help="Quantidade ou valor a acrescentar por mês na progressão linear."
                  />
                  <Input
                    placeholder="Ex.: 1"
                    value={planForm.stepValue}
                    onChange={e => setPlanForm(prev => ({ ...prev, stepValue: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldHelp label="Início" help="Data a partir da qual o plano começa a gerar aportes mensais." />
                <DatePopover
                  value={planForm.startDate}
                  onChange={date => setPlanForm(prev => ({ ...prev, startDate: date }))}
                />
              </div>
              <div className="space-y-2">
                <FieldHelp label="Encerramento" help="Data final do plano. Deixe em branco para continuar indefinidamente." />
                <DatePopover
                  value={planForm.endDate}
                  placeholder="Sem data de encerramento"
                  clearLabel="Remover data final"
                  onChange={date => setPlanForm(prev => ({ ...prev, endDate: date }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} isLoading={createPlan.isPending || updatePlan.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={executionDialogOpen}
        onOpenChange={open => {
          setExecutionDialogOpen(open)
          if (!open) {
            setEditingExecution(null)
            setExecutionForm(defaultExecutionForm())
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExecution ? 'Editar aporte' : 'Registrar aporte'}</DialogTitle>
            <DialogDescription>
              {editingExecution
                ? 'Ajuste os dados desse lançamento para recalcular posição, preço médio e histórico.'
                : 'Salve a execução real para atualizar posição, preço médio e histórico.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FieldHelp
              label="Ativo"
              help="Escolha o ativo que recebeu a compra real neste lançamento."
            />
            <Select
              value={executionForm.assetId}
              onValueChange={value => setExecutionForm(prev => ({ ...prev, assetId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ativo" />
              </SelectTrigger>
              <SelectContent>
                {assets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.symbol} • {asset.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldHelp
              label="Plano"
              help="Vincule a compra a um planejamento recorrente para baixar a pendência do mês correto."
            />
            <Select
              value={executionForm.planId || noPlanValue}
              onValueChange={value =>
                setExecutionForm(prev => ({ ...prev, planId: value === noPlanValue ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Plano opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={noPlanValue}>Sem plano vinculado</SelectItem>
                {plans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.assetSymbol} • {plan.mode === 'amount' ? 'Valor' : 'Quantidade'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldHelp
                  label="Mês de referência"
                  help="Mês ao qual este aporte pertence no planejamento, mesmo que você tenha comprado em outra data."
                />
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
                  <Select
                    value={executionForm.referenceMonth.slice(5, 7)}
                    onValueChange={month =>
                      setExecutionForm(prev => ({
                        ...prev,
                        referenceMonth: `${prev.referenceMonth.slice(0, 4)}-${month}`,
                      }))
                    }
                  >
                    <SelectTrigger className="min-w-0">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={executionForm.referenceMonth.slice(0, 4)}
                    onValueChange={year =>
                      setExecutionForm(prev => ({
                        ...prev,
                        referenceMonth: `${year}-${prev.referenceMonth.slice(5, 7)}`,
                      }))
                    }
                  >
                    <SelectTrigger className="min-w-0">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 16 }, (_, index) => String(2020 + index)).map(year => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <FieldHelp
                  label="Data da compra"
                  help="Dia em que a compra foi executada de fato."
                />
                <DatePopover
                  value={executionForm.executedAt}
                  onChange={date => setExecutionForm(prev => ({ ...prev, executedAt: date }))}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <FieldHelp
                  label="Preço unitário"
                  help="Preço pago por unidade na compra. Se houver cotação conhecida, esse campo já pode vir preenchido."
                />
                <CurrencyInput
                  placeholder="Preço unitário"
                  value={parseCurrencyString(executionForm.executedUnitPrice)}
                  onValueChange={value =>
                    setExecutionForm(prev => ({ ...prev, executedUnitPrice: value.toFixed(2) }))
                  }
                />
                {(() => {
                  const asset = assets.find(a => a.id === executionForm.assetId)
                  if (!asset?.currentPrice) return null
                  return (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                      onClick={() => setExecutionForm(prev => ({ ...prev, executedUnitPrice: String(asset.currentPrice) }))}
                    >
                      <span className="text-muted-foreground/60">Cotação:</span>
                      <span className="font-medium">{formatCurrency(asset.currentPrice)}</span>
                      <span className="text-primary/70">↑ usar</span>
                    </button>
                  )
                })()}
              </div>
              <div className="space-y-2">
                <FieldHelp
                  label="Quantidade"
                  help="Número de cotas, ações ou frações compradas nessa execução."
                />
                <Input
                  placeholder="Quantidade"
                  value={executionForm.executedQuantity}
                  onChange={e => setExecutionForm(prev => ({ ...prev, executedQuantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <FieldHelp
                  label="Valor investido"
                  help="Total calculado automaticamente a partir de quantidade x preço unitário."
                />
                <CurrencyInput
                  placeholder="Valor investido"
                  value={parseCurrencyString(executionForm.investedAmount)}
                  disabled
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExecutionDialogOpen(false)
                setEditingExecution(null)
                setExecutionForm(defaultExecutionForm())
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRegisterExecution}
              isLoading={createExecution.isPending || updateExecution.isPending}
            >
              {editingExecution ? 'Salvar alterações' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cotação manual</DialogTitle>
            <DialogDescription>
              Salve um preço manual para usar como override ou fallback do ativo selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={quoteAsset?.symbol ?? ''} disabled />
            <Input value={quotePrice} onChange={e => setQuotePrice(e.target.value)} placeholder="Ex.: 10.50" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveQuote} isLoading={setQuote.isPending}>
              Salvar cotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={onboardingDialogOpen}
        onOpenChange={open => {
          setOnboardingDialogOpen(open)
          if (!open) {
            setWizardStep(1)
            setWizardStepVisible(1)
            setWizardStepAnimating(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastro guiado da carteira</DialogTitle>
            <DialogDescription>
              Monte tudo como rascunho e só grave na carteira quando finalizar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { id: 1, title: 'Ativo' },
                { id: 2, title: 'Plano' },
                { id: 3, title: 'Aporte' },
              ].map(step => {
                const completed = wizardStep > step.id
                const current = wizardStep === step.id

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToWizardStep(step.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/20 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/35 hover:shadow-sm"
                  >
                    <div
                      className={
                        completed
                          ? 'flex size-8 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : current
                            ? 'flex size-8 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary'
                            : 'flex size-8 items-center justify-center rounded-full border text-muted-foreground'
                      }
                    >
                      {completed ? <CheckCircle2 className="size-4" /> : step.id}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {stepStatusLabel(completed, current)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div
              className={
                wizardStepAnimating
                  ? 'min-h-[420px] translate-y-2 opacity-0 transition-all duration-150'
                  : 'min-h-[420px] translate-y-0 opacity-100 transition-all duration-200'
              }
            >
            {wizardStepVisible === 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Preencha o ativo que você quer acompanhar. Você pode voltar depois para editar antes de finalizar.
                </p>
                <div className="space-y-2">
                  <FieldHelp
                    label="Classe do ativo"
                    help="Categoria usada para organizar a carteira, como Ação, FII, ETF ou Renda fixa."
                  />
                  <Select
                    value={assetForm.assetClass}
                    onValueChange={value => setAssetForm(prev => ({ ...prev, assetClass: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Classe do ativo" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetClassOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldHelp label="Ticker" help="Código do ativo, como VALE3, PETR4 ou MXRF11." />
                  <Input
                    placeholder="Ticker"
                    value={assetForm.symbol}
                    onChange={e => setAssetForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  />
                  {duplicateAssetSymbol ? (
                    <div className="flex items-center gap-2 text-xs text-amber-500">
                      <AlertCircle className="size-3.5" />
                      Já existe um ativo com esse ticker na sua carteira.
                    </div>
                  ) : null}
                  {assetForm.symbol.trim() ? (
                    <div className="flex items-center gap-2 text-xs">
                      {isCheckingQuote ? (
                        <span className="text-muted-foreground">Testando cotação automática...</span>
                      ) : quotePreview ? (
                        <>
                          <span className={quotePreview.supported ? 'text-emerald-500' : 'text-amber-500'}>
                            {quotePreview.message}
                          </span>
                          {quotePreview.supported && quotePreview.price != null ? (
                            <Badge variant="secondary">{formatCurrency(quotePreview.price)}</Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-500">
                              <AlertCircle className="size-3.5" />
                              Manual recomendado
                            </span>
                          )}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <Input
                  placeholder="Nome do ativo"
                  value={assetForm.displayName}
                  onChange={e => setAssetForm(prev => ({ ...prev, displayName: e.target.value }))}
                />
                <div className="space-y-2">
                  <FieldHelp
                    label="Tipo de cotação"
                    help="Define de onde vem o preço atual do ativo: automático, manual ou automático com fallback manual."
                  />
                  <Select
                    value={assetForm.quotePreference}
                    onValueChange={value =>
                      setAssetForm(prev => ({
                        ...prev,
                        quotePreference: value as AssetFormState['quotePreference'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Preferência de cotação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto_with_manual_fallback" disabled={quotePreview?.supported === false}>
                        Automática com fallback manual
                      </SelectItem>
                      <SelectItem value="auto" disabled={quotePreview?.supported === false}>
                        Automática
                      </SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  {assetForm.quotePreference === 'manual' && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Informe o preço atual do ativo. Você pode atualizar manualmente sempre que quiser.
                      </p>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 47.50"
                        value={assetForm.manualPrice}
                        onChange={e => setAssetForm(prev => ({ ...prev, manualPrice: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
                <Textarea
                  placeholder="Observações"
                  value={assetForm.notes}
                  onChange={e => setAssetForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            ) : null}

            {wizardStepVisible === 2 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Defina a recorrência mensal do ativo preenchido no passo anterior.
                </p>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Ativo deste plano</p>
                  <p className="mt-1 font-medium">
                    {assetForm.symbol || 'Ticker'} • {assetForm.displayName || 'Nome do ativo'}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <FieldHelp
                      label="Modo do plano"
                      help="Escolhe se a recorrência será definida por valor em reais ou por quantidade de unidades do ativo."
                    />
                    <Select value={planForm.mode} onValueChange={value => setPlanForm(prev => ({ ...prev, mode: value as PlanFormState['mode'] }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Modo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Valor mensal</SelectItem>
                        <SelectItem value="quantity">Quantidade mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldHelp
                      label="Progressão"
                      help="Fixo repete sempre o mesmo valor ou quantidade. Linear aumenta mês a mês usando o passo definido abaixo."
                    />
                    <Select
                      value={planForm.progressionType}
                      onValueChange={value => setPlanForm(prev => ({ ...prev, progressionType: value as PlanFormState['progressionType'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Progressão" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixo</SelectItem>
                        <SelectItem value="linear_step">Linear</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className={`grid gap-4 ${planForm.progressionType === 'linear_step' ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                  <div className="space-y-2">
                    <FieldHelp
                      label={planForm.mode === 'amount' ? 'Valor inicial' : 'Quantidade inicial'}
                      help={
                        planForm.mode === 'amount'
                          ? 'Primeiro valor mensal planejado para esse ativo, em reais.'
                          : 'Primeira quantidade mensal planejada para esse ativo.'
                      }
                    />
                    {planForm.mode === 'amount' ? (
                      <CurrencyInput
                        placeholder="Valor inicial"
                        value={parseCurrencyString(planForm.initialValue)}
                        onValueChange={value =>
                          setPlanForm(prev => ({ ...prev, initialValue: value.toFixed(2) }))
                        }
                      />
                    ) : (
                      <Input
                        placeholder="Quantidade inicial"
                        value={planForm.initialValue}
                        onChange={e => setPlanForm(prev => ({ ...prev, initialValue: e.target.value }))}
                      />
                    )}
                  </div>
                  {planForm.progressionType === 'linear_step' && (
                    <div className="space-y-2">
                      <FieldHelp
                        label="Incremento mensal"
                        help={
                          planForm.mode === 'amount'
                            ? 'Quanto o valor mensal aumenta a cada novo mês do plano.'
                            : 'Quantas unidades extras entram a cada novo mês do plano.'
                        }
                      />
                      {planForm.mode === 'amount' ? (
                        <CurrencyInput
                          placeholder="Incremento mensal"
                          value={parseCurrencyString(planForm.stepValue)}
                          onValueChange={value =>
                            setPlanForm(prev => ({ ...prev, stepValue: value.toFixed(2) }))
                          }
                        />
                      ) : (
                        <Input
                          placeholder="Ex.: 1"
                          value={planForm.stepValue}
                          onChange={e => setPlanForm(prev => ({ ...prev, stepValue: e.target.value }))}
                        />
                      )}
                    </div>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <FieldHelp
                      label="Data inicial"
                      help="Dia em que a recorrência começa. O sistema usa esse mês como base para gerar as próximas pendências."
                    />
                    <DatePopover
                      value={planForm.startDate}
                      onChange={date => setPlanForm(prev => ({ ...prev, startDate: date }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldHelp
                      label="Data final"
                      help="Opcional. Se preenchida, encerra a recorrência nessa data e para de gerar novos meses planejados."
                    />
                    <DatePopover
                      value={planForm.endDate}
                      placeholder="Sem data final"
                      clearLabel="Remover data final"
                      onChange={date => setPlanForm(prev => ({ ...prev, endDate: date }))}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStepVisible === 3 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Revise a compra real e confira o resumo antes de gravar tudo na carteira.
                </p>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Ativo e plano vinculados</p>
                  <p className="mt-1 font-medium">
                    {assetForm.symbol || 'Ticker'} • {assetForm.displayName || 'Nome do ativo'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {planForm.mode === 'amount' ? 'Plano por valor' : 'Plano por quantidade'} •{' '}
                    {planForm.progressionType === 'fixed' ? 'Fixo' : 'Linear'}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <FieldHelp
                      label="Mês de referência"
                      help="Mês ao qual este aporte pertence no planejamento, mesmo que a compra real tenha acontecido em outra data."
                    />
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
                      <Select
                        value={executionForm.referenceMonth.slice(5, 7)}
                        onValueChange={month =>
                          setExecutionForm(prev => ({
                            ...prev,
                            referenceMonth: `${prev.referenceMonth.slice(0, 4)}-${month}`,
                          }))
                        }
                      >
                        <SelectTrigger className="min-w-0">
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={executionForm.referenceMonth.slice(0, 4)}
                        onValueChange={year =>
                          setExecutionForm(prev => ({
                            ...prev,
                            referenceMonth: `${year}-${prev.referenceMonth.slice(5, 7)}`,
                          }))
                        }
                      >
                        <SelectTrigger className="min-w-0">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 16 }, (_, index) => String(2020 + index)).map(year => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FieldHelp
                      label="Data da compra"
                      help="Dia em que a compra foi executada de fato."
                    />
                    <DatePopover
                      value={executionForm.executedAt}
                      onChange={date => setExecutionForm(prev => ({ ...prev, executedAt: date }))}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <FieldHelp
                      label="Preço unitário"
                      help="Preço pago por unidade na compra. Se houver cotação conhecida, esse campo já pode vir preenchido."
                    />
                    <CurrencyInput
                      placeholder="Preço unitário"
                      value={parseCurrencyString(executionForm.executedUnitPrice)}
                      onValueChange={value =>
                        setExecutionForm(prev => ({ ...prev, executedUnitPrice: value.toFixed(2) }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldHelp
                      label="Quantidade"
                      help="Número de ações, cotas ou frações compradas nessa execução."
                    />
                    <Input
                      placeholder="Quantidade"
                      value={executionForm.executedQuantity}
                      onChange={e => setExecutionForm(prev => ({ ...prev, executedQuantity: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldHelp
                      label="Valor investido"
                      help="Total calculado automaticamente a partir de quantidade x preço unitário."
                    />
                    <CurrencyInput
                      placeholder="Valor investido"
                      value={parseCurrencyString(executionForm.investedAmount)}
                      disabled
                    />
                  </div>
                </div>

                <div className="rounded-xl border bg-background p-4">
                  <p className="text-sm font-semibold">Resumo geral</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confira abaixo o que será criado ao finalizar este cadastro guiado.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Ativo</p>
                      <p className="mt-1 font-medium">{assetForm.symbol || '-'}</p>
                      <p className="text-sm text-muted-foreground">{assetForm.displayName || '-'}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano</p>
                      <p className="mt-1 font-medium">
                        {planForm.mode === 'amount' ? 'Valor mensal' : 'Quantidade mensal'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Inicial {planForm.initialValue || '-'} • Incremento {planForm.stepValue || '0'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Primeiro aporte</p>
                      <p className="mt-1 font-medium">
                        {executionForm.investedAmount
                          ? formatCurrency(parseCurrencyString(executionForm.investedAmount))
                          : '-'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {executionForm.executedQuantity || '-'} un. • preço unitário{' '}
                        {executionForm.executedUnitPrice
                          ? formatCurrency(parseCurrencyString(executionForm.executedUnitPrice))
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            </div>
          </div>

          <DialogFooter>
            {wizardStep > 1 ? (
              <Button variant="outline" onClick={() => goToWizardStep(Math.max(1, wizardStep - 1))}>
                Voltar
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setOnboardingDialogOpen(false)}>
                Cancelar
              </Button>
            )}

            {wizardStep === 1 ? (
              <>
                <Button
                  variant="ghost"
                  isLoading={createAsset.isPending}
                  disabled={
                    !assetForm.symbol.trim() ||
                    !assetForm.displayName.trim() ||
                    !assetForm.assetClass.trim() ||
                    duplicateAssetSymbol
                  }
                  onClick={() => handleFinishWizard('asset')}
                >
                  Finalizar
                </Button>
                <Button
                  disabled={
                    !assetForm.symbol.trim() ||
                    !assetForm.displayName.trim() ||
                    !assetForm.assetClass.trim() ||
                    duplicateAssetSymbol
                  }
                  onClick={() => goToWizardStep(2)}
                >
                  Criar planejamento →
                </Button>
              </>
            ) : null}

            {wizardStep === 2 ? (
              <>
                <Button
                  variant="ghost"
                  isLoading={createAsset.isPending || createPlan.isPending}
                  disabled={
                    !planForm.initialValue.trim() ||
                    !planForm.startDate.trim() ||
                    (planForm.progressionType === 'linear_step' && !planForm.stepValue.trim())
                  }
                  onClick={() => handleFinishWizard('asset_plan')}
                >
                  Finalizar
                </Button>
                <Button
                  disabled={
                    !planForm.initialValue.trim() ||
                    !planForm.startDate.trim() ||
                    (planForm.progressionType === 'linear_step' && !planForm.stepValue.trim())
                  }
                  onClick={() => {
                    setExecutionForm(prev => ({
                      ...prev,
                      referenceMonth: planForm.startDate.slice(0, 7),
                      executedUnitPrice:
                        prev.executedUnitPrice ||
                        (quotePreview?.supported && quotePreview.price != null
                          ? quotePreview.price.toFixed(2)
                          : prev.executedUnitPrice),
                    }))
                    goToWizardStep(3)
                  }}
                >
                  Criar aporte →
                </Button>
              </>
            ) : null}

            {wizardStep === 3 ? (
              <Button
                isLoading={createAsset.isPending || createPlan.isPending || createExecution.isPending}
                onClick={() => handleFinishWizard('asset_plan_execution')}
                disabled={
                  duplicateAssetSymbol ||
                  !executionForm.investedAmount.trim() ||
                  !executionForm.executedQuantity.trim() ||
                  !executionForm.executedUnitPrice.trim()
                }
              >
                Finalizar
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(assetToDelete)} onOpenChange={open => !open && setAssetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ativo</AlertDialogTitle>
            <AlertDialogDescription>
              {assetToDelete ? (
                <>
                  Você está prestes a excluir <strong>{assetToDelete.symbol}</strong>. Isso pode remover também
                  planejamentos, execuções e cotações associadas a este ativo, dependendo das regras do banco.
                  Use essa ação apenas se quiser descartar esse ativo da carteira.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async e => {
                e.preventDefault()
                if (!assetToDelete) return
                await handleDeleteAsset(assetToDelete)
                setAssetToDelete(null)
              }}
            >
              Excluir ativo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(planToDelete)} onOpenChange={open => !open && setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano</AlertDialogTitle>
            <AlertDialogDescription>
              {planToDelete ? (
                <>
                  Você está prestes a excluir o plano de <strong>{planToDelete.assetSymbol}</strong>. Isso interrompe
                  novas pendências e projeções desse planejamento. Execuções já registradas podem continuar existindo
                  como histórico, mas deixam de ficar vinculadas a esse plano caso o banco remova o relacionamento.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async e => {
                e.preventDefault()
                if (!planToDelete) return
                await handleDeletePlan(planToDelete)
                setPlanToDelete(null)
              }}
            >
              Excluir plano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(executionToDelete)} onOpenChange={open => !open && setExecutionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aporte</AlertDialogTitle>
            <AlertDialogDescription>
              {executionToDelete ? (
                <>
                  Você está prestes a excluir o aporte de <strong>{executionToDelete.referenceMonth}</strong> no valor de{' '}
                  <strong>{formatCurrency(executionToDelete.investedAmount)}</strong>. Isso recalcula a posição, o preço médio e o rendimento do ativo.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async e => {
                e.preventDefault()
                if (!executionToDelete) return
                await handleDeleteExecution(executionToDelete.id)
                setExecutionToDelete(null)
              }}
            >
              Excluir aporte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AiChatPanel />
    </div>
  )
}

function MetricCard({ title, value, helper }: { title: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

function MiniMetric({
  label,
  value,
  helper,
  helperVariant,
  variant,
  help,
}: {
  label: string
  value: string
  helper?: string
  helperVariant?: 'positive' | 'negative'
  variant?: 'positive' | 'negative'
  help?: string
}) {
  const valueColor =
    variant === 'positive'
      ? 'text-emerald-400'
      : variant === 'negative'
        ? 'text-rose-400'
        : ''
  const helperColor =
    helperVariant === 'positive'
      ? 'text-emerald-400'
      : helperVariant === 'negative'
        ? 'text-rose-400'
        : 'text-muted-foreground'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-lg bg-muted/40 p-3 transition-colors hover:bg-muted/60">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`mt-1 font-medium ${valueColor}`}>{value}</p>
          {helper ? <p className={`mt-1 text-xs ${helperColor}`}>{helper}</p> : null}
        </div>
      </TooltipTrigger>
      {help ? (
        <TooltipContent side="top" sideOffset={8} className="max-w-64">
          {help}
        </TooltipContent>
      ) : null}
    </Tooltip>
  )
}

function DatePopover({
  value,
  onChange,
  placeholder = 'Selecione a data',
  clearLabel,
}: {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  clearLabel?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          <span>{value ? formatDate(value) : placeholder}</span>
          <Calendar className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[10010] w-auto overflow-hidden p-0 pointer-events-auto">
        {clearLabel && (
          <div className="border-b p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => { onChange(''); setOpen(false) }}
            >
              {clearLabel}
            </Button>
          </div>
        )}
        <CalendarPicker
          mode="single"
          selected={value ? new Date(`${value}T00:00:00`) : undefined}
          captionLayout="dropdown"
          onSelect={date => {
            onChange(date ? date.toISOString().slice(0, 10) : '')
            if (date) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function FieldHelp({ label, help }: { label: string; help: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-semibold text-muted-foreground/70 underline decoration-dotted underline-offset-2 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Ajuda sobre ${label}`}
          >
            <CircleHelp className="size-3.5" strokeWidth={1.8} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="max-w-64">
          {help}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
