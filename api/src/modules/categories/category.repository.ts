import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { categories, type CategoryType } from '@/db/schemas/categories'

export type CategoryRecord = typeof categories.$inferSelect

export type CreateCategoryData = {
  organizationId: string
  name: string
  type?: CategoryType
  color?: string | null
  icon?: string | null
  parentId?: string | null
}

export type UpdateCategoryData = Partial<Omit<CreateCategoryData, 'organizationId'>>

export interface CategoryRepository {
  findAllByOrganization(organizationId: string): Promise<CategoryRecord[]>
  findById(organizationId: string, id: string): Promise<CategoryRecord | null>
  findByNameAndParent(
    organizationId: string,
    name: string,
    parentId: string | null,
    type: CategoryType
  ): Promise<CategoryRecord | null>
  create(data: CreateCategoryData): Promise<CategoryRecord>
  update(id: string, data: UpdateCategoryData): Promise<CategoryRecord | null>
  softDelete(id: string): Promise<CategoryRecord | null>
}

export class DrizzleCategoryRepository implements CategoryRepository {
  async findAllByOrganization(organizationId: string): Promise<CategoryRecord[]> {
    return db
      .select()
      .from(categories)
      .where(
        and(eq(categories.organizationId, organizationId), eq(categories.isActive, true))
      )
      .orderBy(categories.type, categories.name)
  }

  async findById(organizationId: string, id: string): Promise<CategoryRecord | null> {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.organizationId, organizationId)))
      .limit(1)

    return category ?? null
  }

  async findByNameAndParent(
    organizationId: string,
    name: string,
    parentId: string | null,
    type: CategoryType
  ): Promise<CategoryRecord | null> {
    const conditions = [
      eq(categories.organizationId, organizationId),
      eq(categories.name, name),
      eq(categories.type, type),
    ]

    if (parentId == null) {
      conditions.push(isNull(categories.parentId))
    } else {
      conditions.push(eq(categories.parentId, parentId))
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .limit(1)

    return category ?? null
  }

  async create(data: CreateCategoryData): Promise<CategoryRecord> {
    const [created] = await db
      .insert(categories)
      .values({
        organizationId: data.organizationId,
        name: data.name,
        type: data.type ?? 'expense',
        color: data.color ?? null,
        icon: data.icon ?? null,
        parentId: data.parentId ?? null,
      })
      .returning()

    return created
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryRecord | null> {
    const [updated] = await db
      .update(categories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning()

    return updated ?? null
  }

  async softDelete(id: string): Promise<CategoryRecord | null> {
    const [updated] = await db
      .update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning()

    return updated ?? null
  }
}
