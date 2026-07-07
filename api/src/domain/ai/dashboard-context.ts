export type InsightType = 'warning' | 'tip' | 'positive'

export type DashboardInsight = {
  title: string
  body: string
  type: InsightType
}

export type CategoryChange = {
  name: string
  current: number
  previous: number
  changePercent: number | null
}

export type DashboardInsightsContext = {
  monthLabel: string
  income: number
  expense: number
  myExpense: number
  balance: number
  savingsRate: number | null
  previousIncome: number
  previousExpense: number
  previousMyExpense: number
  previousBalance: number
  netWorth: number
  overdueCount: number
  overdueTotal: number
  pendingCount: number
  pendingSplitsTotal: number
  recurringMonthlyTotal: number
  recurringCount: number
  categoryChanges: CategoryChange[]
  recentTrends: { month: string; income: number; expense: number; balance: number }[]
  topPendingExpenses: { name: string; amount: number }[]
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function buildDashboardInsightsPrompt(data: DashboardInsightsContext): string {
  const categoryLines = data.categoryChanges
    .map(c => {
      const change =
        c.changePercent == null
          ? 'sem dados no mês anterior'
          : `${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(0)}%`
      return `• ${c.name}: ${formatBRL(c.current)} (${change})`
    })
    .join('\n')

  const trendLines = data.recentTrends
    .map(t => `• ${t.month}: receitas ${formatBRL(t.income)}, despesas ${formatBRL(t.expense)}`)
    .join('\n')

  const pendingLines = data.topPendingExpenses
    .map(e => `• ${e.name}: ${formatBRL(e.amount)}`)
    .join('\n')

  return `Você é o HouseBot, assistente financeiro do HouseApp.
Analise os dados financeiros e gere insights práticos para economizar.

Responda APENAS com JSON válido neste formato (sem markdown, sem texto extra):
{"insights":[{"title":"string","body":"string","type":"warning"|"tip"|"positive"}]}

Regras:
- Gere entre 3 e 5 insights
- Use português brasileiro
- Seja específico com valores e categorias dos dados
- type "warning" para riscos (vencidas, saldo negativo, categoria em alta)
- type "tip" para sugestões de economia
- type "positive" para pontos positivos
- NÃO invente dados que não estejam abaixo

Mês: ${data.monthLabel}
Receitas: ${formatBRL(data.income)}
Meu gasto: ${formatBRL(data.myExpense)}
Despesas da casa: ${formatBRL(data.expense)}
Saldo do mês: ${formatBRL(data.balance)}
Taxa de poupança: ${data.savingsRate != null ? `${data.savingsRate.toFixed(0)}%` : 'N/A'}
Patrimônio líquido: ${formatBRL(data.netWorth)}

Mês anterior:
Receitas: ${formatBRL(data.previousIncome)}
Meu gasto: ${formatBRL(data.previousMyExpense)}
Despesas da casa: ${formatBRL(data.previousExpense)}
Saldo: ${formatBRL(data.previousBalance)}

Pendências: ${data.pendingCount} transações
Vencidas: ${data.overdueCount} (${formatBRL(data.overdueTotal)})
Splits pendentes: ${formatBRL(data.pendingSplitsTotal)}
Recorrentes ativas: ${data.recurringCount} (custo mensal estimado: ${formatBRL(data.recurringMonthlyTotal)})

Categorias de despesa (atual vs anterior):
${categoryLines || 'nenhuma'}

Tendência recente:
${trendLines || 'nenhuma'}

Maiores despesas pendentes:
${pendingLines || 'nenhuma'}`
}

export function buildFallbackInsights(data: DashboardInsightsContext): DashboardInsight[] {
  const insights: DashboardInsight[] = []

  if (data.balance < 0) {
    insights.push({
      title: 'Saldo negativo no mês',
      body: `Seu gasto (${formatBRL(data.myExpense)}) superou as receitas (${formatBRL(data.income)}). Revise gastos não essenciais.`,
      type: 'warning',
    })
  } else if (data.balance > 0) {
    insights.push({
      title: 'Saldo positivo',
      body: `Você economizou ${formatBRL(data.balance)} este mês. Considere reservar parte desse valor.`,
      type: 'positive',
    })
  }

  if (data.overdueCount > 0) {
    insights.push({
      title: 'Contas vencidas',
      body: `Você tem ${data.overdueCount} transação(ões) vencida(s), totalizando ${formatBRL(data.overdueTotal)}. Priorize a regularização.`,
      type: 'warning',
    })
  }

  const risingCategory = data.categoryChanges.find(c => c.changePercent != null && c.changePercent > 20)
  if (risingCategory) {
    insights.push({
      title: `${risingCategory.name} em alta`,
      body: `Gastos com ${risingCategory.name} subiram ${risingCategory.changePercent!.toFixed(0)}% em relação ao mês anterior (${formatBRL(risingCategory.current)}).`,
      type: 'tip',
    })
  }

  const dominantCategory = data.categoryChanges[0]
  if (dominantCategory && data.expense > 0 && dominantCategory.current / data.expense > 0.3) {
    const pct = ((dominantCategory.current / data.expense) * 100).toFixed(0)
    insights.push({
      title: 'Maior categoria de gasto',
      body: `${dominantCategory.name} representa ${pct}% das despesas (${formatBRL(dominantCategory.current)}). Vale revisar se há espaço para cortes.`,
      type: 'tip',
    })
  }

  if (data.recurringMonthlyTotal > 0) {
    insights.push({
      title: 'Custos fixos recorrentes',
      body: `${data.recurringCount} transação(ões) recorrente(s) somam cerca de ${formatBRL(data.recurringMonthlyTotal)}/mês. Avalie se todas ainda são necessárias.`,
      type: 'tip',
    })
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Continue registrando',
      body: 'Mantenha seus lançamentos em dia para receber insights mais personalizados sobre seus hábitos financeiros.',
      type: 'tip',
    })
  }

  return insights.slice(0, 5)
}

export function parseInsightsJson(raw: string): DashboardInsight[] | null {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned) as { insights?: DashboardInsight[] }
    if (!Array.isArray(parsed.insights)) return null

    const valid = parsed.insights.filter(
      item =>
        typeof item.title === 'string' &&
        typeof item.body === 'string' &&
        ['warning', 'tip', 'positive'].includes(item.type)
    )

    return valid.length > 0 ? valid.slice(0, 5) : null
  } catch {
    return null
  }
}
