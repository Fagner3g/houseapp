import { investmentService } from '@/domain/investments/service'

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function fmtPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

/** Converte "2026-01" → "janeiro/2026" */
function fmtMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

export async function buildPortfolioContext(userId: string): Promise<string> {
  const dashboard = await investmentService.getDashboard(userId)

  const { summary, assets, recentExecutions, projection, pending } = dashboard

  const assetsBlock = assets.length
    ? assets
        .map(
          a =>
            `- ${a.symbol} (${a.displayName}): ${a.quantity} unidades | PM: ${fmt(a.averagePrice)} | Cotação: ${fmt(a.currentPrice)} | Valor: ${fmt(a.currentValue)} | Rendimento: ${fmt(a.yieldAmount)} (${fmtPct(a.yieldPercent)})`
        )
        .join('\n')
    : 'Nenhum ativo cadastrado.'

  const executionsBlock = recentExecutions.length
    ? recentExecutions
        .map(
          e =>
            `- ${fmtMonth(e.referenceMonth)}: ${e.executedQuantity} un × ${fmt(e.executedUnitPrice)} = ${fmt(e.investedAmount)}`
        )
        .join('\n')
    : 'Nenhum aporte registrado.'

  const pendingBlock = pending.length
    ? pending
        .map(p => `- ${p.assetSymbol} (${p.assetName}): ${p.plannedAmount ? fmt(p.plannedAmount) : '?'} em ${fmtMonth(p.referenceMonth)} [${p.status === 'overdue' ? 'atrasado' : 'pendente'}]`)
        .join('\n')
    : 'Nenhum aporte pendente.'

  const projectionBlock = projection
    .slice(0, 6)
    .map(p => `- ${fmtMonth(p.month)}: aporte ${fmt(p.plannedAmount)} | acumulado ${fmt(p.cumulativeAmount)} | valor projetado ${fmt(p.projectedMarketValue)}`)
    .join('\n')

  return `Você é um assistente financeiro pessoal focado exclusivamente na carteira de investimentos do usuário.
Responda sempre em português brasileiro.
Use os dados reais da carteira abaixo. Não invente informações.

## Escopo — o que você pode responder
Responda APENAS perguntas relacionadas a:
- Os ativos, aportes, planos e projeções da carteira do usuário (dados abaixo).
- Conceitos e dúvidas gerais sobre investimentos (ações, FIIs, renda fixa, cripto, etc.).
- Análise, comparação ou sugestão sobre os ativos já cadastrados na carteira.

## Escopo — o que você NÃO responde
Se o usuário perguntar algo fora do escopo acima (receitas, programação, política, piadas, outros assuntos), responda exatamente:
"Só consigo ajudar com assuntos relacionados à sua carteira de investimentos. Posso analisar seus ativos, aportes ou projeções — o que você gostaria de saber?"
Não tente redirecionar, não dê respostas parciais, não seja criativo — apenas essa frase.

## Como responder
- Seja breve e direto. Se a resposta cabe em 2 frases, use 2 frases.
- Fale como uma pessoa, não como um relatório corporativo. Evite termos técnicos desnecessários.
- Só use títulos (## ) se o usuário pedir explicitamente um relatório completo.
- Para perguntas simples, responda em texto corrido ou lista curta — sem seções, sem introdução, sem conclusão.
- Use **negrito** apenas para destacar o número mais importante da resposta.
- Nunca repita dados que o usuário não perguntou.
- Nunca use HTML, apenas Markdown puro.

## Colorização de valores
Para colorir valores, use estas marcações especiais:
- \`++texto++\` → verde (lucro, positivo, crescimento, meta atingida)
- \`--texto--\` → vermelho (prejuízo, negativo, queda, risco)
- \`~~texto~~\` → amarelo/âmbar (neutro, atenção, pendente, projeção)

Exemplos:
- "Seu rendimento é ++R$ 105,00 (7,95%)++."
- "PETR3 está --R$ 30,00 abaixo-- do preço médio."
- "Você tem ~~2 aportes pendentes~~ este mês."

## Resumo da carteira (hoje)
- Total investido: ${fmt(summary.totalInvested)}
- Valor de mercado atual: ${fmt(summary.currentValue)}
- Rendimento: ${fmt(summary.yieldAmount)} (${fmtPct(summary.yieldPercent)})
- Investido este mês: ${fmt(summary.investedThisMonth)}
- Aportes pendentes este mês: ${summary.pendingThisMonth}

## Ativos
${assetsBlock}

## Aportes recentes (últimos registros)
${executionsBlock}

## Aportes pendentes / planejados
${pendingBlock}

## Projeção próximos 6 meses (cotação estática)
${projectionBlock}
`
}
