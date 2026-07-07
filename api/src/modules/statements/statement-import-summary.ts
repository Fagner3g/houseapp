import type { ImportStatementBody } from './statement.schema'

type CategoryLookup = { id: string; name: string; type: string }

export type StatementImportSummary = {
  expensesCount: number
  expensesTotal: string
  incomeCount: number
  incomeTotal: string
  installmentCount: number
  categorizedCount: number
  splitsInferredCount: number
  previewTransactions: Array<{
    title: string
    amount: string
    date: string
    type: 'income' | 'expense'
    installmentLabel?: string
    categoryId?: string
    categoryName?: string
  }>
}

function sumByType(transactions: ImportStatementBody['transactions'], type: 'income' | 'expense') {
  return transactions
    .filter(item => (item.type ?? 'expense') === type)
    .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)
    .toFixed(2)
}

export function buildStatementImportSummary(
  parsed: ImportStatementBody,
  categories: CategoryLookup[] = [],
  previewLimit = 5
): StatementImportSummary {
  const categoryNameById = new Map(categories.map(category => [category.id, category.name]))
  const expenses = parsed.transactions.filter(item => (item.type ?? 'expense') === 'expense')
  const income = parsed.transactions.filter(item => item.type === 'income')
  const installmentCount = parsed.transactions.filter(
    item => item.installmentNumber != null && item.installmentsTotal != null
  ).length

  const previewTransactions = parsed.transactions.slice(0, previewLimit).map(item => {
    const categoryId = item.categoryIds?.[0]
    return {
      title: item.title,
      amount: item.amount,
      date: item.date,
      type: (item.type ?? 'expense') as 'income' | 'expense',
      installmentLabel:
        item.installmentNumber != null && item.installmentsTotal != null
          ? `${item.installmentNumber}/${item.installmentsTotal}`
          : undefined,
      categoryId,
      categoryName: categoryId ? categoryNameById.get(categoryId) : undefined,
    }
  })

  return {
    expensesCount: expenses.length,
    expensesTotal: sumByType(parsed.transactions, 'expense'),
    incomeCount: income.length,
    incomeTotal: sumByType(parsed.transactions, 'income'),
    installmentCount,
    categorizedCount: parsed.transactions.filter(item => item.categoryIds?.length).length,
    splitsInferredCount: parsed.transactions.filter(item => item.splitHint != null).length,
    previewTransactions,
  }
}
