import type { CategoryRepository } from '@/modules/categories/category.repository'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'
import type { CategorizationExample } from '@/modules/statements/statement-categorizer'

export async function loadCategorizationHistory(
  transactionRepository: TransactionRepository,
  organizationId: string,
  accountId: string,
  categoryNameById: Map<string, string>
): Promise<CategorizationExample[]> {
  const pastResult = await transactionRepository.findMany({
    organizationId,
    accountId,
    page: 1,
    perPage: 150,
  })

  const examples: CategorizationExample[] = []

  for (const row of pastResult.rows) {
    const categoryIds = pastResult.categoryIdsByTransaction.get(row.id) ?? []
    const categoryId = categoryIds[0]

    if (!categoryId) continue

    examples.push({
      title: row.title,
      categoryId,
      categoryName: categoryNameById.get(categoryId) ?? categoryId,
      categoryType: row.type === 'income' ? 'income' : 'expense',
    })
  }

  return examples
}

export async function loadCategoryRows(categoryRepository: CategoryRepository, organizationId: string) {
  const categories = await categoryRepository.findAllByOrganization(organizationId)
  return categories.map(category => ({
    id: category.id,
    name: category.name,
    type: category.type,
  }))
}
