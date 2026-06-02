export interface TransactionItem {
  title: string
  amount: number
  originalAmount?: number
  valuePaid?: number
  isPartial?: boolean
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
  const formatItem = (t: TransactionItem) => {
    const parcel = t.installmentInfo ? ` (${t.installmentInfo})` : ''
    let partialLine = ''
    if (t.isPartial) {
      const paid = t.valuePaid != null ? `Pago: ${formatBRL(t.valuePaid)} | ` : ''
      partialLine = `\n  ${paid}Restante: ${formatBRL(t.amount)}${t.originalAmount ? ` de ${formatBRL(t.originalAmount)}` : ''} [parcial]`
    }
    return `• *${t.title.trim()}*${parcel}${partialLine}\n  ${formatBRL(t.amount)}`
  }

  const criticalList = data.critical
    .map(t => {
      const label = t.daysUntilDue === 0 ? 'HOJE' : 'AMANHÃ'
      return `${formatItem(t)} — ${label} (${t.dueDate})`
    })
    .join('\n\n')

  const reminderList = data.reminders
    .map(t => `${formatItem(t)} — em ${t.daysUntilDue} dias (${t.dueDate})`)
    .join('\n\n')

  const totalAmount = [...data.critical, ...data.reminders].reduce((sum, t) => sum + t.amount, 0)
  const partialCount = [...data.critical, ...data.reminders].filter(t => t.isPartial).length

  return `${BASE_INSTRUCTIONS}

Relatório: *Alertas de vencimento* — transações nos próximos 4 dias.
${data.personName ? `\nDestinatário: *${data.personName}*` : ''}
${data.critical.length + data.reminders.length} transações — Total: ${formatBRL(totalAmount)}${partialCount > 0 ? ` — ${partialCount} parcial(is)` : ''}

${data.critical.length > 0 ? 'CRÍTICOS (HOJE/AMANHÃ)\n' + criticalList + '\n\n' : ''}${data.reminders.length > 0 ? 'PRÓXIMOS (2-4 dias)\n' + reminderList + '\n' : ''}${data.critical.length === 0 && data.reminders.length === 0 ? 'Nenhum vencimento nos próximos 4 dias.' : ''}

Formato para celular: cada item em 2-3 linhas (título em negrito, depois valor/data). Itens separados por linha em branco. Resumo final curto com recomendação. Para transações marcadas com "[parcial]", deixe claro: quanto já foi pago, quanto ainda resta, e o valor total original. O valor "Restante" é o que ainda falta pagar.`
}

export function buildOverdueAlertsPrompt(data: OverdueAlertsData): string {
  const overdueList = data.overdue
    .map(t => {
      const parcel = t.installmentInfo ? ` (${t.installmentInfo})` : ''
      let partialLine = ''
      if (t.isPartial) {
        const paid = t.valuePaid != null ? `Pago: ${formatBRL(t.valuePaid)} | ` : ''
        partialLine = `\n  ${paid}Restante: ${formatBRL(t.amount)}${t.originalAmount ? ` de ${formatBRL(t.originalAmount)}` : ''} [parcial]`
      }
      return `• *${t.title.trim()}*${parcel}${partialLine}\n  ${formatBRL(t.amount)} — ${t.dueDate} — ${t.overdueDays} dias atrás`
    })
    .join('\n\n')

  const total = data.overdue.reduce((sum, t) => sum + t.amount, 0)
  const oldest = data.overdue.length > 0
    ? Math.max(...data.overdue.map(t => t.overdueDays ?? 0))
    : 0
  const partialCount = data.overdue.filter(t => t.isPartial).length

  return `${BASE_INSTRUCTIONS}

Relatório: *Transações vencidas* — todas as pendências.
${data.personName ? `\nDestinatário: *${data.personName}*` : ''}

${data.overdue.length} vencidas — Total: ${formatBRL(total)}${oldest > 0 ? ` — mais antiga: ${oldest} dias` : ''}${partialCount > 0 ? ` — ${partialCount} parcial(is)` : ''}

${data.overdue.length > 0 ? overdueList : 'Nenhuma transação vencida.'}

Formato para celular: cada item em 2-3 linhas. Itens separados por linha em branco. Ao final, um resumo curto com recomendação. Para transações marcadas com "[parcial]", deixe claro: quanto já foi pago, quanto ainda resta, e o valor total original. O valor "Restante" é o que ainda falta pagar.`
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
