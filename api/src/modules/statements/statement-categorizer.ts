import {
  completeWithProvider,
  listAvailableProviders,
  type ProviderName,
} from '@/domain/ai/providers'

import type { ImportStatementBody } from './statement.schema'
import { isCardStatementCreditTitle } from './invoice-status'

type CategoryRow = { id: string; name: string; type: string }

export type CategorizationExample = {
  title: string
  categoryId: string
  categoryName: string
}

const HEURISTIC_RULES: Array<{ pattern: RegExp; categoryName: string }> = [
  {
    pattern:
      /uber|99\*|taxi|shell|posto|combust|xebra|nutag|premmia|park plus|estacionam|easyjet|abastecer|peg pag|auto posto/i,
    categoryName: 'Transporte & Mobilidade',
  },
  {
    pattern:
      /ifood|ifd\*|99food|delivery|restaur|burger|japa|bar |boteco|subway|ze delivery|nadinhos|santo japa|zigpay|zig\*|temaki|churrasc|pizzar|bistro|lanches|cafe|cervejaria|esfirra|hotdog|doceria|panificadora|peixe|caldo de cana|biscoit|mep\*|marukai|santorini|tatu bola|trem bom|cappta|bolota|silvinhos|frigideira de minas|chico do peixe|canabrava|vila para restaurante|teresa cafe|mercado|super |epa |pão|paod|carne|carnes|extra|araujo|empório|queijo|coelho diniz|carrefour|minimercado|padaria|frigideira|emporio|curral emp|h\.m\.f\.|distribuidora wallac|estrela do vale|comercial braga|minas rural|sn cidade|lojas rede|jesuconatural|je_suconatural|rezende/i,
    categoryName: 'Alimentação',
  },
  {
    pattern:
      /seguro|justos|condomínio|condominio|aluguel|luz |energia|água|agua|internet|vivo|claro|tim fibra|oi fibra|starlink|band ?larga|netflix|spotify|youtube|amazon prime|disney|hbo|globoplay|deezer|apple music|assinatura|subscription|paramount|crunchyroll|cursor|claude\.?ai|github|jetbrains|notion|figma|openai|chatgpt/i,
    categoryName: 'Moradia & Contas Fixas',
  },
  {
    pattern:
      /academia|fit|lifebox|saúde|imede|diagnost|drogaria|droga mix|dentist|odonto|hospital|farmácia|farmacia|asa\*casal/i,
    categoryName: 'Saúde & Bem-estar',
  },
  {
    pattern:
      /sympla|cinema|pesque pague|lounge|dome lounge|hotel|suites|hospedagem|airbnb|booking|uni brasil|vantagens\.cvolta|renner|constance|boutiq|cea |moda|vestuário|vestuario|roupa|calçado|calcado|ruivasstores|meu prata|joia|prata lj|leroy merlin|casas bahia|casas lealtex|utilidades|decoração|decoracao|móveis|moveis|eletrodomést|eletrodomest|mgpower|k2 phones|eletronic|tigrescelular|informática|informatica|phone|celular|notebook|tablet|kaka eletronicos|shopee|amazonmktplc|amazon|mercado ?livre|aliexpress|olx|nupay|zp\*olx|educa|curso|faculdade|escola|udemy|coursera|livro/i,
    categoryName: 'Compras & Lazer',
  },
  {
    pattern:
      /parafuso|obracom|ferragem|material de construção|terraplana|depósito|deposito estancia|papelaria|ferrament|paodapracafestas|organizacoes junqueira|gennius|comercial e|empreendimento|trabalho|serviço profissional|icaroiannisouza|carlos cesar|valdinei marcos|edercarlospereira|cassiosonio|65651968|62464341|m a p comercio|raimunda lopes/i,
    categoryName: 'Negócio & Trabalho',
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

function categorizeWithHeuristics(
  transaction: ImportStatementBody['transactions'][number],
  categories: CategoryRow[]
): string | null {
  if (transaction.type === 'income') {
    if (isCardStatementCreditTitle(transaction.title)) {
      return null
    }

    return (
      resolveCategoryId(categories, 'Outras Receitas', 'income') ??
      resolveCategoryId(categories, 'Salário / Renda Principal', 'income')
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

    const historicalMatch = historicalExamples.find(example =>
      titlesAreSimilar(example.title, transaction.title)
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
    const categoryId = assignments.get(index)

    return {
      ...transaction,
      categoryIds: categoryId ? [categoryId] : undefined,
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
