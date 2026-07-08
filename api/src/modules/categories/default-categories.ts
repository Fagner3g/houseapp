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

/**
 * Categorias padrão com nomes compostos (ex.: "Restaurantes & Delivery", "Renda Extra / Freelance").
 * Moradia unificada; alimentação separada (mercado vs restaurante).
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Receitas
  { name: 'Salário', type: 'income', color: '#10B981' },
  { name: 'Renda Extra / Freelance', type: 'income', color: '#059669' },
  { name: 'Rendimentos', type: 'income', color: '#34D399' },
  { name: 'Outras Receitas', type: 'income', color: '#6EE7B7' },

  // Despesas
  { name: 'Moradia / Contas & Manutenção', type: 'expense', color: '#8B5CF6' },
  { name: 'Supermercado', type: 'expense', color: '#F59E0B' },
  { name: 'Restaurantes & Delivery', type: 'expense', color: '#D97706' },
  { name: 'Transporte', type: 'expense', color: '#3B82F6' },
  { name: 'Saúde', type: 'expense', color: '#EC4899' },
  { name: 'Educação', type: 'expense', color: '#6366F1' },
  { name: 'Assinaturas & Streaming', type: 'expense', color: '#A855F7' },
  { name: 'Lazer & Entretenimento', type: 'expense', color: '#F97316' },
  { name: 'Vestuário & Acessórios', type: 'expense', color: '#EF4444' },
  { name: 'Eletrônicos & Tecnologia', type: 'expense', color: '#0EA5E9' },
  { name: 'Serviços & Profissionais', type: 'expense', color: '#57534E' },
  { name: 'Empréstimos & Dívidas', type: 'expense', color: '#9333EA' },
]

/** Nomes de categorias antigas → categoria canônica atual (mesmo tipo). */
const DEPRECATED_CATEGORY_MIGRATIONS: Array<{
  from: string
  to: string
  type: CategoryType
}> = [
  // Legado v1 → canônicas atuais
  { from: 'Salário / Renda Principal', to: 'Salário', type: 'income' },
  { from: 'Moradia & Contas Fixas', to: 'Moradia / Contas & Manutenção', type: 'expense' },
  { from: 'Alimentação', to: 'Supermercado', type: 'expense' },
  { from: 'Transporte & Mobilidade', to: 'Transporte', type: 'expense' },
  { from: 'Saúde & Bem-estar', to: 'Saúde', type: 'expense' },
  { from: 'Compras & Lazer', to: 'Vestuário & Acessórios', type: 'expense' },
  { from: 'Empréstimo', to: 'Empréstimos & Dívidas', type: 'expense' },
  { from: 'Moradia (Aluguel, Luz, Condomínio)', to: 'Moradia / Contas & Manutenção', type: 'expense' },
  { from: 'Internet & Assinaturas', to: 'Assinaturas & Streaming', type: 'expense' },
  { from: 'Internet, TV & Streaming', to: 'Assinaturas & Streaming', type: 'expense' },
  { from: 'Software & Ferramentas', to: 'Assinaturas & Streaming', type: 'expense' },
  { from: 'Mercado', to: 'Supermercado', type: 'expense' },
  { from: 'Restaurantes, Bares & Delivery', to: 'Restaurantes & Delivery', type: 'expense' },
  { from: 'Transporte (Uber, Combustível)', to: 'Transporte', type: 'expense' },
  { from: 'Saúde, Farmácia & Bem-estar', to: 'Saúde', type: 'expense' },
  { from: 'Lazer & Hobbies', to: 'Lazer & Entretenimento', type: 'expense' },
  { from: 'Casa & Utilidades', to: 'Moradia / Contas & Manutenção', type: 'expense' },
  { from: 'Compras Online', to: 'Vestuário & Acessórios', type: 'expense' },
  { from: 'Material & Ferragens', to: 'Moradia / Contas & Manutenção', type: 'expense' },

  // Legado v2/v3/v4 → canônicas atuais
  { from: 'Contas da Casa', to: 'Moradia / Contas & Manutenção', type: 'expense' },
  { from: 'Compras Pessoais', to: 'Vestuário & Acessórios', type: 'expense' },
  { from: 'Casa & Manutenção', to: 'Moradia / Contas & Manutenção', type: 'expense' },
  { from: 'Negócio & Trabalho', to: 'Serviços & Profissionais', type: 'expense' },
  { from: 'Aluguel', to: 'Moradia / Contas & Manutenção', type: 'expense' },
  { from: 'Contas', to: 'Moradia / Contas & Manutenção', type: 'expense' },
  { from: 'Manutenção', to: 'Moradia / Contas & Manutenção', type: 'expense' },
  { from: 'Moradia', to: 'Moradia / Contas & Manutenção', type: 'expense' },
  { from: 'Pets', to: 'Supermercado', type: 'expense' },
  { from: 'Freelance', to: 'Renda Extra / Freelance', type: 'income' },
  { from: 'Investimentos', to: 'Rendimentos', type: 'income' },
  { from: 'Outros', to: 'Outras Receitas', type: 'income' },
  { from: 'Restaurante', to: 'Restaurantes & Delivery', type: 'expense' },
  { from: 'Assinaturas', to: 'Assinaturas & Streaming', type: 'expense' },
  { from: 'Lazer', to: 'Lazer & Entretenimento', type: 'expense' },
  { from: 'Vestuário', to: 'Vestuário & Acessórios', type: 'expense' },
  { from: 'Eletrônicos', to: 'Eletrônicos & Tecnologia', type: 'expense' },
  { from: 'Serviços', to: 'Serviços & Profissionais', type: 'expense' },
  { from: 'Dívidas', to: 'Empréstimos & Dívidas', type: 'expense' },
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
