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
