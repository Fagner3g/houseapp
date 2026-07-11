import {
  completeWithProvider,
  listAvailableProviders,
  type ProviderName,
} from '@/domain/ai/providers'

import type { ImportStatementBody } from './statement.schema'
import { isCardStatementCreditTitle } from '@houseapp/finance-core'

type CategoryRow = { id: string; name: string; type: string }

export type CategorizationExample = {
  title: string
  categoryId: string
  categoryName: string
  categoryType: 'income' | 'expense'
}

const HEURISTIC_RULES: Array<{ pattern: RegExp; categoryName: string }> = [
  {
    pattern:
      /uber|99\*|taxi|shell|posto|combust|xebra|nutag|premmia|park plus|estacionam|easyjet|abastecer|peg pag|auto posto|ipva|pedágio|pedagio|metrô|metro|ônibus|onibus|passagem|locadora|estapar/i,
    categoryName: 'Transporte',
  },
  {
    pattern:
      /cervejaria|choperia|boteco|\bbar\b|\bpub\b|adega|\bbalada\b|chopp|tap house|\bdrinks\b/i,
    categoryName: 'Bares',
  },
  {
    pattern:
      /shopee|amazonmktplc|\bamazon\b|mercado ?livre|aliexpress|shein|\bolx\b|nupay|zp\*olx|magalu|americanas|submarino|tiktok shop|\btemu\b/i,
    categoryName: 'Compras Online & Marketplaces',
  },
  {
    pattern:
      /ifood|ifd\*|99food|delivery|restaur|burger|japa|subway|ze delivery|nadinhos|santo japa|zigpay|zig\*|temaki|churrasc|pizzar|bistro|lanches|esfirra|hotdog|doceria|panificadora|peixe|caldo de cana|biscoit|mep\*|marukai|santorini|tatu bola|trem bom|cappta|bolota|silvinhos|frigideira de minas|chico do peixe|canabrava|vila para restaurante|teresa cafe/i,
    categoryName: 'Restaurantes & Delivery',
  },
  {
    pattern:
      /mercado|super |epa |pão|paod|carne|carnes|extra|araujo|empório|queijo|coelho diniz|carrefour|minimercado|padaria|frigideira|emporio|curral emp|h\.m\.f\.|distribuidora wallac|estrela do vale|comercial braga|minas rural|sn cidade|lojas rede|jesuconatural|je_suconatural|rezende|açougue|acougue|feira|hortifruti/i,
    categoryName: 'Supermercado',
  },
  {
    pattern:
      /condomínio|condominio|aluguel|iptu|financiamento imob|imobiliária|imobiliaria|taxa de incêndio|incendio|luz |energia|cemig|cpfl|enel|light |água|agua|sabesp|copasa|gás|gas |internet|vivo|claro|tim fibra|oi fibra|starlink|band ?larga|telefone|telefonia|leroy merlin|casas bahia|casas lealtex|utilidades|decoração|decoracao|móveis|moveis|eletrodomést|eletrodomest|parafuso|obracom|ferragem|material de construção|terraplana|depósito|deposito estancia|ferrament/i,
    categoryName: 'Moradia / Contas & Manutenção',
  },
  {
    pattern:
      /netflix|spotify|youtube|amazon prime|disney|hbo|globoplay|deezer|apple music|paramount|crunchyroll|cursor|claude\.?ai|github|jetbrains|notion|figma|openai|chatgpt|assinatura|subscription|microsoft 365|google one|icloud/i,
    categoryName: 'Assinaturas & Streaming',
  },
  {
    pattern:
      /seguro|justos|academia|fit|lifebox|saúde|imede|diagnost|drogaria|droga mix|dentist|odonto|hospital|farmácia|farmacia|asa\*casal|unimed|amil|sulamerica|consulta médica|consulta medica|laborat|veterin/i,
    categoryName: 'Saúde & Beleza',
  },
  {
    pattern:
      /sympla|cinema|pesque pague|dome lounge|hotel|suites|hospedagem|airbnb|booking|uni brasil|vantagens\.cvolta|show |ingresso|parque|viagem|passagem aérea|passagem aerea|latam|gol linhas|azul linhas/i,
    categoryName: 'Lazer & Entretenimento',
  },
  {
    pattern:
      /renner|constance|boutiq|cea |moda|vestuário|vestuario|roupa|calçado|calcado|ruivasstores|meu prata|joia|prata lj|zara|riachuelo/i,
    categoryName: 'Vestuário & Acessórios',
  },
  {
    pattern:
      /mgpower|k2 phones|eletronic|tigrescelular|informática|informatica|phone|celular|notebook|tablet|kaka eletronicos|magazine luiza|kabum|fast shop/i,
    categoryName: 'Eletrônicos & Tecnologia',
  },
  {
    pattern:
      /educa|curso|faculdade|escola|udemy|coursera|livro|universidade|colégio|colegio|material escolar|duolingo|papelaria|paodapracafestas/i,
    categoryName: 'Educação',
  },
  {
    pattern:
      /organizacoes junqueira|gennius|comercial e|empreendimento|trabalho|serviço profissional|icaroiannisouza|carlos cesar|valdinei marcos|edercarlospereira|cassiosonio|65651968|62464341|m a p comercio|raimunda lopes/i,
    categoryName: 'Serviços & Profissionais',
  },
  {
    pattern:
      /empréstimo|emprestimo|financiamento|parcela banco|juros|acordo|consignado|nubank empr|creditas|bmg/i,
    categoryName: 'Empréstimos & Dívidas',
  },
]

function resolveCategoryId(
  categories: CategoryRow[],
  name: string,
  type: 'income' | 'expense'
): string | null {
  const normalized = name.trim().toLowerCase()
  const pool = categories.filter(category => category.type === type)

  const exact = pool.find(category => category.name.toLowerCase() === normalized)
  if (exact) return exact.id

  const partial = pool.find(
    category =>
      category.name.toLowerCase().includes(normalized) ||
      normalized.includes(category.name.toLowerCase())
  )
  return partial?.id ?? null
}

function isCategoryValidForTransaction(
  categories: CategoryRow[],
  categoryId: string,
  type: 'income' | 'expense'
): boolean {
  const category = categories.find(row => row.id === categoryId)
  return category?.type === type
}

function categorizeWithHeuristics(
  transaction: ImportStatementBody['transactions'][number],
  categories: CategoryRow[]
): string | null {
  if (transaction.type === 'income') {
    if (isCardStatementCreditTitle(transaction.title)) {
      return null
    }

    const title = transaction.title.toLowerCase()
    if (/salário|salario|folha|13º|13o|holerite|pro labore|prolabore/i.test(title)) {
      return resolveCategoryId(categories, 'Salário', 'income')
    }
    if (/freelance|freela|honorário|honorario|bico|extra/i.test(title)) {
      return resolveCategoryId(categories, 'Renda Extra / Freelance', 'income')
    }
    if (/dividendo|juros|rendimento|resgate|cdb|lci|lca|fii|tesouro|invest/i.test(title)) {
      return resolveCategoryId(categories, 'Rendimentos', 'income')
    }

    return (
      resolveCategoryId(categories, 'Outras Receitas', 'income') ??
      resolveCategoryId(categories, 'Salário', 'income')
    )
  }

  const title = transaction.title.toLowerCase()
  for (const rule of HEURISTIC_RULES) {
    if (rule.pattern.test(title)) {
      const id = resolveCategoryId(categories, rule.categoryName, 'expense')
      if (id) return id
    }
  }

  return null
}

function extractJsonArray(raw: string): unknown[] | null {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() ?? trimmed

  const arrayStart = candidate.indexOf('[')
  const arrayEnd = candidate.lastIndexOf(']')
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    try {
      const parsed = JSON.parse(candidate.slice(arrayStart, arrayEnd + 1))
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  return null
}

async function categorizeWithLlm(
  items: Array<{ index: number; title: string; type: 'income' | 'expense' }>,
  categories: CategoryRow[],
  providerName: ProviderName,
  historicalExamples: CategorizationExample[] = []
): Promise<Map<number, string>> {
  const categoryList = categories
    .map(category => `- [${category.type}] ${category.name} (id: ${category.id})`)
    .join('\n')

  const txList = items
    .map(item => `${item.index}. [${item.type}] ${item.title}`)
    .join('\n')

  const historicalText =
    historicalExamples.length > 0
      ? historicalExamples
          .slice(0, 80)
          .map(example => `- "${example.title}" → ${example.categoryName} (id: ${example.categoryId})`)
          .join('\n')
      : 'Nenhum histórico disponível.'

  const prompt = `Categorize cada transação abaixo usando APENAS ids de categorias da lista.

Categorias disponíveis:
${categoryList}

Histórico de categorização desta conta (use como referência para padrões recorrentes):
${historicalText}

Transações a categorizar:
${txList}

Regras:
- Use o histórico acima quando o título/estabelecimento for similar a transações já categorizadas.
- Supermercado = mercado/feira; Restaurantes & Delivery = comer fora ou delivery; Bares = bar, boteco, cervejaria, pub, balada.
- Compras Online & Marketplaces = Shopee, Mercado Livre, Amazon marketplace, Shein, AliExpress, OLX, Temu.
- Moradia / Contas & Manutenção = aluguel, condomínio, luz, água, gás, internet fixa, reforma.
- Assinaturas & Streaming = Netflix, Spotify, software recorrente.
- Se NÃO houver correspondência clara, NÃO inclua a transação no resultado — deixe sem categoria para revisão manual.
- JAMAIS invente ou chute uma categoria.

Retorne JSON array apenas para transações com categoria clara: [{"index":0,"categoryId":"..."}]
Use somente categorias do tipo correto (expense para despesa, income para receita).`

  const response = await completeWithProvider(
    providerName,
    [{ role: 'user', content: prompt }],
    'Você categoriza transações financeiras com base em histórico e padrões. Responda apenas com JSON array válido. Nunca invente categorias — omita transações incertas.'
  )

  const parsed = extractJsonArray(response)
  const result = new Map<number, string>()
  if (!parsed) return result

  const validIds = new Set(categories.map(category => category.id))

  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const index = typeof item.index === 'number' ? item.index : null
    const categoryId = typeof item.categoryId === 'string' ? item.categoryId : null
    if (index == null || !categoryId || !validIds.has(categoryId)) continue

    const transaction = items.find(entry => entry.index === index)
    if (!transaction || !isCategoryValidForTransaction(categories, categoryId, transaction.type)) {
      continue
    }

    result.set(index, categoryId)
  }

  return result
}

export async function categorizeStatementTransactions(
  transactions: ImportStatementBody['transactions'],
  categories: CategoryRow[],
  options?: { historicalExamples?: CategorizationExample[] }
): Promise<ImportStatementBody['transactions']> {
  if (categories.length === 0 || transactions.length === 0) {
    return transactions
  }

  const historicalExamples = options?.historicalExamples ?? []
  const assignments = new Map<number, string>()
  const uncategorized: Array<{ index: number; title: string; type: 'income' | 'expense' }> = []

  transactions.forEach((transaction, index) => {
    const type = (transaction.type ?? 'expense') as 'income' | 'expense'

    if (isCardStatementCreditTitle(transaction.title)) {
      return
    }

    const historicalMatch = historicalExamples.find(
      example =>
        example.categoryType === type && titlesAreSimilar(example.title, transaction.title)
    )
    if (historicalMatch) {
      assignments.set(index, historicalMatch.categoryId)
      return
    }

    const heuristicId = categorizeWithHeuristics(transaction, categories)
    if (heuristicId) {
      assignments.set(index, heuristicId)
      return
    }
    uncategorized.push({ index, title: transaction.title, type })
  })

  const provider = listAvailableProviders()[0]
  if (provider && uncategorized.length > 0) {
    const chunkSize = 40
    for (let offset = 0; offset < uncategorized.length; offset += chunkSize) {
      const chunk = uncategorized.slice(offset, offset + chunkSize)
      try {
        const llmAssignments = await categorizeWithLlm(
          chunk,
          categories,
          provider.name,
          historicalExamples
        )
        for (const [index, categoryId] of llmAssignments) {
          assignments.set(index, categoryId)
        }
      } catch {
        // mantém heurística e histórico apenas
      }
    }
  }

  return transactions.map((transaction, index) => {
    const type = (transaction.type ?? 'expense') as 'income' | 'expense'
    const categoryId = assignments.get(index)

    return {
      ...transaction,
      categoryIds:
        categoryId && isCategoryValidForTransaction(categories, categoryId, type)
          ? [categoryId]
          : undefined,
    }
  })
}

function titlesAreSimilar(a: string, b: string): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9* ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const left = normalize(a)
  const right = normalize(b)

  if (!left || !right) return false
  if (left === right) return true
  if (left.includes(right) || right.includes(left)) return true

  const leftTokens = left.split(' ').filter(token => token.length > 2)
  const rightTokens = new Set(right.split(' ').filter(token => token.length > 2))

  if (leftTokens.length === 0 || rightTokens.size === 0) return false

  const overlap = leftTokens.filter(token => rightTokens.has(token)).length
  return overlap / leftTokens.length >= 0.6
}

export function countCategorizedTransactions(
  transactions: ImportStatementBody['transactions']
): number {
  return transactions.filter(transaction => transaction.categoryIds?.length).length
}
