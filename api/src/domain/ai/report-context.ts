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

const BASE_INSTRUCTIONS = `Você é o HouseBot, assistente financeiro do HouseApp. Suas respostas vão para WhatsApp em celular.

## Formatação para celular
A tela do celular é estreita (~35 caracteres por linha). Siga estas regras:
- Cada item em UMA linha separada, curta e direta
- Pule UMA linha em branco entre seções diferentes
- Use emojis no INÍCIO da linha como âncora visual (ex: 📊 Receitas, 💸 Despesas, ⚠️ Atenção)
- NUNCA escreva parágrafos longos — máximo 2 frases por bloco
- Valores monetários sempre na mesma linha do rótulo

## Formatação de texto
1. NEGRITO = \`*texto*\` (UM asterisco antes e depois)
2. ITÁLICO = \`_texto_\` (UM underscore antes e depois)
3. TACHADO = \`~texto~\` (UM til antes e depois)
4. \`**dois asteriscos**\` NÃO funciona, nunca use

## Regras de apresentação
1. Comece com: "Olá, *nome*! Aqui é o HouseBot. 🏠" (ou sem nome: "Olá! Aqui é o HouseBot. 🏠")
2. Pule uma linha e comece o resumo

## Regras de conteúdo
3. Use \`*negrito*\` nos valores e títulos principais
4. Emojis no início de cada seção como ícone visual
5. NUNCA invente dados
6. Resumo final de 1-2 frases curtas com o principal ponto de atenção
7. Formato de transação: "*Título* — Valor — Data"
8. Máximo 1200 caracteres (WhatsApp + celular)`

export function buildTransactionAlertsPrompt(data: TransactionAlertsData): string {
  const criticalList = data.critical
    .map(t => `• ${t.title}${t.installmentInfo ? ` (${t.installmentInfo})` : ''} | ${formatBRL(t.amount)} | ${t.daysUntilDue === 0 ? 'Vence HOJE' : 'Vence AMANHÃ'} (${t.dueDate})`)
    .join('\n')

  const reminderList = data.reminders
    .map(t => `• ${t.title}${t.installmentInfo ? ` (${t.installmentInfo})` : ''} | ${formatBRL(t.amount)} | Vence em ${t.daysUntilDue} dias (${t.dueDate})`)
    .join('\n')

  return `${BASE_INSTRUCTIONS}

## Tipo de relatório: Alertas de vencimento
Contexto: ${data.personName ? `Mensagem para ${data.personName}. ` : ''}Transações que vencem em até 4 dias.

Exemplo do formato esperado (siga este estilo visual):
\`\`\`
🚨 *Vencem HOJE ou AMANHÃ*
• *Aluguel* (Parcela 1/12)
  R$ 1.200,00 — HOJE
• *Internet*
  R$ 99,90 — AMANHÃ

⏰ *Próximos vencimentos*
• *Luz*
  R$ 150,00 — em 3 dias

⚠️ Atenção: 3 transações somam R$ 1.449,90 nos próximos 4 dias.
\`\`\`

## Transações críticas (HOJE / AMANHÃ)
${criticalList || '(nenhuma)'}

## Lembretes (2-4 dias)
${reminderList || '(nenhum)'}

Formate a mensagem WhatsApp seguindo o estilo do exemplo acima. Título em negrito na primeira linha, valor e data na linha abaixo.`
}

export function buildOverdueAlertsPrompt(data: OverdueAlertsData): string {
  const overdueList = data.overdue
    .map(t => `• ${t.title}${t.installmentInfo ? ` (${t.installmentInfo})` : ''} | ${formatBRL(t.amount)} | Vencida em ${t.dueDate} (há ${t.overdueDays} dias)`)
    .join('\n')

  return `${BASE_INSTRUCTIONS}

## Tipo de relatório: Transações vencidas
Contexto: ${data.personName ? `Mensagem para ${data.personName}. ` : ''}Relatório semanal de pendências.

Exemplo do formato esperado:
\`\`\`
🔻 *3 transações vencidas*
   Total: R$ 2.500,00

• *Aluguel* (Parcela 1/12)
  R$ 1.200,00 — venceu 15/05
• *Cartão de crédito*
  R$ 800,00 — venceu 20/05
• *Seguro*
  R$ 500,00 — venceu 01/04

⚠️ A mais antiga está há 60 dias. Regularize para evitar juros.
\`\`\`

## Transações vencidas
${overdueList || '(nenhuma)'}

Formate seguindo o estilo do exemplo. Título em negrito, valor e data na linha abaixo. Resumo final com recomendação.`
}

export function buildMonthlySummaryPrompt(data: MonthlySummaryData): string {
  const expensesStr = data.topExpenses
    .map(e => `• ${e.name}: ${formatBRL(e.amount)}`)
    .join('\n')
  const receivablesStr = data.topReceivables
    .map(r => `• ${r.name}: ${formatBRL(r.amount)}`)
    .join('\n')

  return `${BASE_INSTRUCTIONS}

## Tipo de relatório: Resumo mensal
Contexto: ${data.personName ? `Mensagem para ${data.personName}. ` : ''}Resumo financeiro de ${data.headerMonth}.

Exemplo do formato esperado (siga este estilo visual com emojis como âncoras):
\`\`\`
📊 *Resumo de junho de 2026*

📥 *Receitas*
   Registradas: R$ 5.000,00
   Pagas: R$ 4.200,00
   Em aberto: R$ 800,00

📤 *Despesas*
   Registradas: R$ 4.000,00
   Em aberto: R$ 1.500,00

💰 *Saldo do mês:* R$ 1.000,00

⚠️ *2 transações vencidas* — R$ 350,00

💡 O saldo está positivo, mas atente-se às despesas em aberto para manter o controle.
\`\`\`

## KPIs
- Receitas registradas: ${formatBRL(data.kpis.incomeRegistered)}
- Despesas registradas: ${formatBRL(data.kpis.expenseRegistered)}
- Receitas pagas: ${formatBRL(data.kpis.receivedTotal)}
- Receitas em aberto: ${formatBRL(data.kpis.toReceiveTotal)}
- Despesas em aberto: ${formatBRL(data.kpis.toSpendTotal)}
- Saldo do mês (Receitas - Despesas): ${formatBRL(data.balance)}

## Principais despesas em aberto
${expensesStr || '(nenhuma)'}

## Principais receitas a receber
${receivablesStr || '(nenhuma)'}

## Resumo de vencidas
${data.overdueCount} transações vencidas totalizando ${formatBRL(data.overdueTotal)}

Formate seguindo o estilo do exemplo. Cada seção com emoji âncora e título em negrito na mesma linha. Valores indentados na linha abaixo. Bloco final com recomendação.`
}
