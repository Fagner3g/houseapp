export interface TransactionItem {
  title: string
  amount: number
  dueDate: string
  daysUntilDue?: number
  overdueDays?: number
  installmentInfo: string | null
}

export interface CounterpartyInfo {
  name: string
  amount: number
}

export interface MonthlySummaryData {
  personName?: string
  headerMonth: string
  kpis: {
    incomeRegistered: number
    expenseRegistered: number
    receivedTotal: number
    toReceiveTotal: number
    toSpendTotal: number
  }
  balance: number
  topExpenses: CounterpartyInfo[]
  topReceivables: CounterpartyInfo[]
  overdueCount: number
  overdueTotal: number
}

export interface TransactionAlertsData {
  personName?: string
  critical: TransactionItem[]
  reminders: TransactionItem[]
  organizationSlug?: string
}

export interface OverdueAlertsData {
  personName?: string
  overdue: TransactionItem[]
  organizationSlug?: string
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const BASE_INSTRUCTIONS = `Você é o HouseBot, assistente financeiro do HouseApp.
Suas respostas são enviadas por WhatsApp. O layout é livre — você decide a melhor forma de apresentar.

Formatação disponível no WhatsApp:
- *negrito* com 1 asterisco
- _itálico_ com 1 underscore
- ~tachado~ com 1 til
- Emojis e quebras de linha são bem-vindos

Comece sempre com saudação: "Olá, *nome*! Aqui é o HouseBot. 🏠" (ou sem nome: "Olá! Aqui é o HouseBot. 🏠")

Use os dados fornecidos. Não invente nada. Seja visual e organizado.`

export function buildTransactionAlertsPrompt(data: TransactionAlertsData): string {
  const criticalList = data.critical
    .map(t => `• ${t.title}${t.installmentInfo ? ` (${t.installmentInfo})` : ''} | ${formatBRL(t.amount)} | ${t.daysUntilDue === 0 ? 'Vence HOJE' : 'Vence AMANHÃ'} (${t.dueDate})`)
    .join('\n')

  const reminderList = data.reminders
    .map(t => `• ${t.title}${t.installmentInfo ? ` (${t.installmentInfo})` : ''} | ${formatBRL(t.amount)} | Vence em ${t.daysUntilDue} dias (${t.dueDate})`)
    .join('\n')

  const totalAmount = [...data.critical, ...data.reminders].reduce((sum, t) => sum + t.amount, 0)

  return `${BASE_INSTRUCTIONS}

Relatório: *Alertas de vencimento* — transações nos próximos 4 dias.
${data.personName ? `\nDestinatário: *${data.personName}*` : ''}
${data.critical.length + data.reminders.length} transações, total de ${formatBRL(totalAmount)}.

${data.critical.length > 0 ? 'CRÍTICOS (HOJE/AMANHÃ)\n' + criticalList + '\n' : ''}${data.reminders.length > 0 ? reminderList + '\n' : ''}${data.critical.length === 0 && data.reminders.length === 0 ? 'Nenhum vencimento nos próximos 4 dias.' : ''}

Monte uma mensagem WhatsApp clara, visual e bem espaçada.`
}

export function buildOverdueAlertsPrompt(data: OverdueAlertsData): string {
  const overdueList = data.overdue
    .map(t => `• ${t.title}${t.installmentInfo ? ` (${t.installmentInfo})` : ''} | ${formatBRL(t.amount)} | Vencida em ${t.dueDate} (há ${t.overdueDays} dias)`)
    .join('\n')

  const total = data.overdue.reduce((sum, t) => sum + t.amount, 0)
  const oldest = data.overdue.length > 0
    ? Math.max(...data.overdue.map(t => t.overdueDays ?? 0))
    : 0

  return `${BASE_INSTRUCTIONS}

Relatório: *Transações vencidas* — fechamento do mês.
${data.personName ? `\nDestinatário: *${data.personName}*` : ''}
${data.overdue.length} vencidas, total de ${formatBRL(total)}${oldest > 0 ? ` — a mais antiga: ${oldest} dias` : ''}.

${data.overdue.length > 0 ? overdueList : 'Nenhuma transação vencida. Parabéns!'}

Monte uma mensagem WhatsApp clara, visual e bem espaçada. Destaque os valores mais altos e a mais antiga.`
}

export function buildMonthlySummaryPrompt(data: MonthlySummaryData): string {
  const expensesStr = data.topExpenses
    .map(e => `• ${e.name}: ${formatBRL(e.amount)}`)
    .join('\n')
  const receivablesStr = data.topReceivables
    .map(r => `• ${r.name}: ${formatBRL(r.amount)}`)
    .join('\n')

  return `${BASE_INSTRUCTIONS}

Relatório: *Resumo mensal* — ${data.headerMonth}.
${data.personName ? `\nDestinatário: *${data.personName}*` : ''}

Receitas registradas: ${formatBRL(data.kpis.incomeRegistered)}
Receitas recebidas: ${formatBRL(data.kpis.receivedTotal)}
Receitas a receber: ${formatBRL(data.kpis.toReceiveTotal)}
Despesas registradas: ${formatBRL(data.kpis.expenseRegistered)}
Despesas em aberto: ${formatBRL(data.kpis.toSpendTotal)}
Saldo: ${formatBRL(data.balance)}
Vencidas: ${data.overdueCount} transações (${formatBRL(data.overdueTotal)})
Maiores despesas em aberto: ${expensesStr || 'nenhuma'}
Maiores receitas a receber: ${receivablesStr || 'nenhuma'}

Monte uma mensagem WhatsApp visual, bem organizada e com espaçamento. Dê sua opinião sobre a saúde financeira baseada nos números.`
}
