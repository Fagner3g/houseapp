import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { categories, type CategoryType } from '@/db/schemas/categories'
import { recurringTransactions } from '@/db/schemas/recurringTransactions'
import { transactionCategories } from '@/db/schemas/transactionCategories'

export type DefaultCategory = {
  name: string
  type: CategoryType
  color: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Salário / Renda Principal', type: 'income', color: '#10B981' },
  { name: 'Outras Receitas', type: 'income', color: '#34D399' },
  { name: 'Moradia & Contas Fixas', type: 'expense', color: '#8B5CF6' },
  { name: 'Alimentação', type: 'expense', color: '#F59E0B' },
  { name: 'Transporte & Mobilidade', type: 'expense', color: '#3B82F6' },
  { name: 'Saúde & Bem-estar', type: 'expense', color: '#EC4899' },
  { name: 'Compras & Lazer', type: 'expense', color: '#F97316' },
  { name: 'Negócio & Trabalho', type: 'expense', color: '#57534E' },
  { name: 'Empréstimo', type: 'expense', color: '#A855F7' },
]

/** Nomes de categorias padrão antigas → categoria canônica atual (mesmo tipo). */
const DEPRECATED_CATEGORY_MIGRATIONS: Array<{
  from: string
  to: string
  type: CategoryType
}> = [
  { from: 'Renda Extra / Freelance', to: 'Outras Receitas', type: 'income' },
  { from: 'Rendimentos', to: 'Outras Receitas', type: 'income' },
  { from: 'Moradia (Aluguel, Luz, Condomínio)', to: 'Moradia & Contas Fixas', type: 'expense' },
  { from: 'Internet & Assinaturas', to: 'Moradia & Contas Fixas', type: 'expense' },
  { from: 'Internet, TV & Streaming', to: 'Moradia & Contas Fixas', type: 'expense' },
  { from: 'Software & Ferramentas', to: 'Moradia & Contas Fixas', type: 'expense' },
  { from: 'Mercado', to: 'Alimentação', type: 'expense' },
  { from: 'Restaurantes & Delivery', to: 'Alimentação', type: 'expense' },
  { from: 'Restaurantes, Bares & Delivery', to: 'Alimentação', type: 'expense' },
  { from: 'Transporte (Uber, Combustível)', to: 'Transporte & Mobilidade', type: 'expense' },
  { from: 'Saúde, Farmácia & Bem-estar', to: 'Saúde & Bem-estar', type: 'expense' },
  { from: 'Educação', to: 'Compras & Lazer', type: 'expense' },
  { from: 'Lazer & Hobbies', to: 'Compras & Lazer', type: 'expense' },
  { from: 'Pets', to: 'Compras & Lazer', type: 'expense' },
  { from: 'Vestuário & Acessórios', to: 'Compras & Lazer', type: 'expense' },
  { from: 'Casa & Utilidades', to: 'Compras & Lazer', type: 'expense' },
  { from: 'Eletrônicos & Tecnologia', to: 'Compras & Lazer', type: 'expense' },
  { from: 'Compras Online', to: 'Compras & Lazer', type: 'expense' },
  { from: 'Compras Pessoais', to: 'Compras & Lazer', type: 'expense' },
  { from: 'Material & Ferragens', to: 'Negócio & Trabalho', type: 'expense' },
]

function categoryKey(name: string, type: CategoryType) {
  return `${type}:${name}`
}

async function migrateCategoryReferences(fromId: string, toId: string): Promise<void> {
  const linkedTransactions = await db
    .select({
      transactionId: transactionCategories.transactionId,
      categoryId: transactionCategories.categoryId,
    })
    .from(transactionCategories)
    .where(eq(transactionCategories.categoryId, fromId))

  for (const link of linkedTransactions) {
    const [existingTarget] = await db
      .select({ transactionId: transactionCategories.transactionId })
      .from(transactionCategories)
      .where(
        and(
          eq(transactionCategories.transactionId, link.transactionId),
          eq(transactionCategories.categoryId, toId)
        )
      )
      .limit(1)

    if (existingTarget) {
      await db
        .delete(transactionCategories)
        .where(
          and(
            eq(transactionCategories.transactionId, link.transactionId),
            eq(transactionCategories.categoryId, fromId)
          )
        )
      continue
    }

    await db
      .update(transactionCategories)
      .set({ categoryId: toId })
      .where(
        and(
          eq(transactionCategories.transactionId, link.transactionId),
          eq(transactionCategories.categoryId, fromId)
        )
      )
  }

  await db
    .update(recurringTransactions)
    .set({ categoryId: toId, updatedAt: new Date() })
    .where(eq(recurringTransactions.categoryId, fromId))
}

async function retireDeprecatedCategories(
  organizationId: string,
  categoryIdByKey: Map<string, string>
): Promise<void> {
  const activeCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.organizationId, organizationId), eq(categories.isActive, true)))

  const activeByKey = new Map(
    activeCategories.map(category => [categoryKey(category.name, category.type), category])
  )

  for (const migration of DEPRECATED_CATEGORY_MIGRATIONS) {
    const oldCategory = activeByKey.get(categoryKey(migration.from, migration.type))
    const newCategoryId = categoryIdByKey.get(categoryKey(migration.to, migration.type))

    if (!oldCategory || !newCategoryId || oldCategory.id === newCategoryId) continue

    await migrateCategoryReferences(oldCategory.id, newCategoryId)

    await db
      .update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(categories.id, oldCategory.id))

    activeByKey.delete(categoryKey(migration.from, migration.type))
  }
}

export async function ensureDefaultCategories(organizationId: string): Promise<void> {
  const existing = await db
    .select({ id: categories.id, name: categories.name, type: categories.type })
    .from(categories)
    .where(and(eq(categories.organizationId, organizationId), eq(categories.isActive, true)))

  const existingKeys = new Set(existing.map(row => categoryKey(row.name, row.type)))
  const toInsert = DEFAULT_CATEGORIES.filter(
    category => !existingKeys.has(categoryKey(category.name, category.type))
  ).map(category => ({
    organizationId,
    name: category.name,
    type: category.type,
    color: category.color,
  }))

  if (toInsert.length > 0) {
    await db.insert(categories).values(toInsert)
  }

  const canonical = await db
    .select({ id: categories.id, name: categories.name, type: categories.type, color: categories.color })
    .from(categories)
    .where(
      and(
        eq(categories.organizationId, organizationId),
        eq(categories.isActive, true),
        inArray(
          categories.name,
          DEFAULT_CATEGORIES.map(category => category.name)
        )
      )
    )

  const categoryIdByKey = new Map(
    canonical.map(category => [categoryKey(category.name, category.type), category.id])
  )

  for (const defaults of DEFAULT_CATEGORIES) {
    const row = canonical.find(
      category => category.name === defaults.name && category.type === defaults.type
    )
    if (!row || row.color === defaults.color) continue

    await db
      .update(categories)
      .set({ color: defaults.color, updatedAt: new Date() })
      .where(eq(categories.id, row.id))
  }

  await retireDeprecatedCategories(organizationId, categoryIdByKey)
}

export async function getOrganizationCategories(organizationId: string) {
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.organizationId, organizationId), eq(categories.isActive, true)))
}

export function getCategoryIdByName(
  rows: Array<{ id: string; name: string; type: string }>,
  name: string,
  type: CategoryType
): string {
  const found = rows.find(row => row.name === name && row.type === type)
  if (!found) {
    throw new Error(`Categoria não encontrada: ${name} (${type})`)
  }
  return found.id
}
