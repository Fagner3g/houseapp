import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { categories, type CategoryType } from '@/db/schemas/categories'

export type DefaultCategory = {
  name: string
  type: CategoryType
  color: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Salário / Renda Principal', type: 'income', color: '#10B981' },
  { name: 'Renda Extra / Freelance', type: 'income', color: '#059669' },
  { name: 'Rendimentos', type: 'income', color: '#34D399' },
  { name: 'Moradia (Aluguel, Luz, Condomínio)', type: 'expense', color: '#8B5CF6' },
  { name: 'Internet & Assinaturas', type: 'expense', color: '#0EA5E9' },
  { name: 'Mercado', type: 'expense', color: '#F59E0B' },
  { name: 'Restaurantes & Delivery', type: 'expense', color: '#FB7185' },
  { name: 'Transporte (Uber, Combustível)', type: 'expense', color: '#3B82F6' },
  { name: 'Saúde & Bem-estar', type: 'expense', color: '#EC4899' },
  { name: 'Educação', type: 'expense', color: '#6366F1' },
  { name: 'Lazer & Hobbies', type: 'expense', color: '#F97316' },
  { name: 'Pets', type: 'expense', color: '#A855F7' },
  { name: 'Compras Pessoais', type: 'expense', color: '#64748B' },
]

export async function ensureDefaultCategories(organizationId: string): Promise<void> {
  const existing = await db
    .select({ name: categories.name, type: categories.type })
    .from(categories)
    .where(and(eq(categories.organizationId, organizationId), eq(categories.isActive, true)))

  const existingKeys = new Set(existing.map(row => `${row.type}:${row.name}`))
  const toInsert = DEFAULT_CATEGORIES.filter(
    category => !existingKeys.has(`${category.type}:${category.name}`)
  ).map(category => ({
    organizationId,
    name: category.name,
    type: category.type,
    color: category.color,
  }))

  if (toInsert.length === 0) return

  await db.insert(categories).values(toInsert)
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
