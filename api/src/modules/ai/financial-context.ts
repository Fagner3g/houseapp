import { container } from '@/core/container'

import type { AiActionName } from './action-store'
import type { FinancialContext } from './tools/types'

const TOOLS_SCHEMA = [
  {
    action: 'create_transaction',
    description: 'Criar uma transação (despesa, receita ou transferência)',
    parameters: {
      title: 'string (obrigatório)',
      amount: 'number ou string em reais (obrigatório)',
      type: 'expense | income | transfer (default: expense)',
      account_id: 'string (id da conta)',
      account_name: 'string (nome/apelido da conta, ex: Nubank)',
      category_name: 'string (nome da categoria — omita se incerto)',
      category_ids: 'string[] (omitir se incerto)',
      date: 'YYYY-MM-DD (default: hoje)',
      status: 'pending | paid (default: pending)',
      description: 'string opcional',
    },
  },
  {
    action: 'import_statement',
    description: 'Importar fatura com lista de transações estruturadas',
    parameters: {
      account_id: 'string',
      account_name: 'string',
      file_name: 'string',
      file_hash: 'string sha256 opcional',
      period_start: 'ISO date',
      period_end: 'ISO date',
      closing_date: 'ISO date',
      due_date: 'ISO date',
      total_amount: 'string opcional',
      minimum_payment: 'string opcional',
      transactions: 'array de { title, amount, date, cardLastFour?, categoryIds? }',
    },
  },
  {
    action: 'pay_transaction',
    description: 'Marcar transação pendente como paga',
    parameters: {
      transaction_id: 'string',
      search_title: 'string (busca por título em transações pendentes)',
      paid_at: 'ISO date opcional',
      paid_amount: 'string opcional',
    },
  },
  {
    action: 'create_split',
    description: 'Dividir transação com outra pessoa (preview stub)',
    parameters: {
      transaction_id: 'string',
      contact_name: 'string',
      amount: 'string em reais',
    },
  },
  {
    action: 'register_split_payment',
    description: 'Registrar pagamento parcial de split (preview stub)',
    parameters: {
      split_id: 'string',
      contact_name: 'string',
      amount: 'string em reais',
      paid_at: 'ISO date opcional',
    },
  },
] as const

export function getToolsSchema(): typeof TOOLS_SCHEMA {
  return TOOLS_SCHEMA
}

export async function buildFinancialContext(organizationId: string): Promise<FinancialContext> {
  const [accounts, categories, transactionsResult] = await Promise.all([
    container.accountService.list(organizationId),
    container.categoryService.list(organizationId),
    container.transactionService.list(organizationId, {
      page: 1,
      perPage: 30,
    }),
  ])

  const accountNameById = new Map(accounts.map(account => [account.id, account.name]))

  return {
    organizationId,
    accounts: accounts.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type,
    })),
    categories: categories.map(category => ({
      id: category.id,
      name: category.name,
    })),
    recentTransactions: transactionsResult.transactions.map(transaction => ({
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      date: transaction.date,
      accountName: transaction.accountId
        ? (accountNameById.get(transaction.accountId) ?? null)
        : null,
      categoryNames: transaction.categoryIds
        .map(id => categories.find(category => category.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    })),
  }
}

export function buildChatSystemPrompt(context: FinancialContext): string {
  const accountsText =
    context.accounts.length > 0
      ? context.accounts.map(account => `- ${account.name} (${account.type}) [id: ${account.id}]`).join('\n')
      : 'Nenhuma conta cadastrada.'

  const categoriesText =
    context.categories.length > 0
      ? context.categories.map(category => `- ${category.name} [id: ${category.id}]`).join('\n')
      : 'Nenhuma categoria cadastrada.'

  const transactionsText =
    context.recentTransactions.length > 0
      ? context.recentTransactions
          .slice(0, 15)
          .map(transaction => {
            const categoryLabel =
              transaction.categoryNames.length > 0
                ? transaction.categoryNames.join(', ')
                : 'sem categoria'
            return `- [${transaction.status}] ${transaction.title} (${transaction.type}) R$ ${transaction.amount ?? '?'} em ${transaction.accountName ?? 'sem conta'} — ${categoryLabel} [id: ${transaction.id}]`
          })
          .join('\n')
      : 'Nenhuma transação recente.'

  const toolsJson = JSON.stringify(TOOLS_SCHEMA, null, 2)

  return `Você é o assistente financeiro do HouseApp. Responda em português brasileiro de forma clara e objetiva.

## Dados da organização
### Contas
${accountsText}

### Categorias
${categoriesText}

### Transações recentes
${transactionsText}

## Ferramentas disponíveis
Quando o usuário pedir para CRIAR, IMPORTAR, PAGAR ou DIVIDIR algo, você DEVE propor uma ação usando exatamente uma linha no final da resposta:
TOOL_CALL:{"action":"<nome_da_acao>", ...parametros}

Ações válidas: ${TOOLS_SCHEMA.map(tool => tool.action).join(', ')}

Schema das ferramentas:
${toolsJson}

Regras:
- Primeiro escreva uma resposta curta em texto natural para o usuário.
- Se precisar executar algo, termine com UMA linha TOOL_CALL: contendo JSON válido.
- Use account_name quando o usuário mencionar o banco/conta pelo nome.
- Valores monetários podem ser número (50) ou string ("50.00") — somente quando informados pelo usuário ou explícitos no contexto.
- Não invente IDs — use os IDs listados acima ou nomes que o usuário mencionou.
- Se faltar informação essencial, pergunte antes de emitir TOOL_CALL.
- Nunca execute diretamente — apenas gere o preview via TOOL_CALL.

## Integridade dos dados (OBRIGATÓRIO)
- JAMAIS invente dados. Se não souber ou não tiver certeza, omita o campo no TOOL_CALL ou deixe para o usuário preencher na interface.
- Valores, datas, estabelecimentos, contas e outros dados sensíveis NUNCA devem ser estimados ou chutados.
- Categorias: preencha category_name/category_ids apenas quando houver correspondência clara (usuário informou, ou o mesmo título/estabelecimento já aparece categorizado nas transações recentes). Se não estiver claro, omita a categoria — a interface permitirá categorizar manualmente.
- Use as transações recentes (com suas categorias) como referência para padrões recorrentes — ex.: "Uber" sempre em Transporte.
- Na importação de faturas, inclua apenas transações e valores literalmente presentes no documento; não complete lacunas com suposições.`
}

export function isValidActionName(value: unknown): value is AiActionName {
  return (
    value === 'create_transaction' ||
    value === 'import_statement' ||
    value === 'pay_transaction' ||
    value === 'create_split' ||
    value === 'register_split_payment'
  )
}
