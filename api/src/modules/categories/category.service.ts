import { badRequest, conflict, notFound } from '@/core/errors'
import { ensureDefaultCategories } from '@/modules/categories/default-categories'

import type {
  CategoryRecord,
  CategoryRepository,
  CreateCategoryData,
} from './category.repository'

export type CategoryDto = {
  id: string
  organizationId: string
  name: string
  type: 'income' | 'expense'
  color: string | null
  icon: string | null
  parentId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function toCategoryDto(category: CategoryRecord): CategoryDto {
  return {
    id: category.id,
    organizationId: category.organizationId,
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon,
    parentId: category.parentId,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

export type CreateCategoryInput = Omit<CreateCategoryData, 'organizationId'>
export type UpdateCategoryInput = Partial<CreateCategoryInput>

export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async list(organizationId: string): Promise<CategoryDto[]> {
    await ensureDefaultCategories(organizationId)
    const rows = await this.categoryRepository.findAllByOrganization(organizationId)
    return rows.map(toCategoryDto)
  }

  async get(organizationId: string, id: string): Promise<CategoryDto> {
    const category = await this.categoryRepository.findById(organizationId, id)

    if (!category || !category.isActive) {
      throw notFound('Category not found')
    }

    return toCategoryDto(category)
  }

  async create(organizationId: string, input: CreateCategoryInput): Promise<CategoryDto> {
    const parentId = input.parentId ?? null
    const type = input.type ?? 'expense'

    if (parentId) {
      await this.validateParent(organizationId, parentId)
    }

    const duplicate = await this.categoryRepository.findByNameAndParent(
      organizationId,
      input.name,
      parentId,
      type
    )

    if (duplicate?.isActive) {
      throw conflict('A category with this name already exists at this level')
    }

    const created = await this.categoryRepository.create({
      organizationId,
      name: input.name,
      type,
      color: input.color,
      icon: input.icon,
      parentId,
    })

    return toCategoryDto(created)
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateCategoryInput
  ): Promise<CategoryDto> {
    const category = await this.categoryRepository.findById(organizationId, id)

    if (!category || !category.isActive) {
      throw notFound('Category not found')
    }

    if (input.parentId !== undefined) {
      if (input.parentId === id) {
        throw badRequest('Category cannot be its own parent')
      }

      if (input.parentId) {
        await this.validateParent(organizationId, input.parentId)
      }
    }

    const nextName = input.name ?? category.name
    const nextParentId = input.parentId !== undefined ? input.parentId : category.parentId
    const nextType = input.type ?? category.type

    if (input.name || input.parentId !== undefined || input.type) {
      const duplicate = await this.categoryRepository.findByNameAndParent(
        organizationId,
        nextName,
        nextParentId,
        nextType
      )

      if (duplicate && duplicate.id !== id && duplicate.isActive) {
        throw conflict('A category with this name already exists at this level')
      }
    }

    const updated = await this.categoryRepository.update(id, {
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon,
      parentId: input.parentId,
    })

    if (!updated) {
      throw notFound('Category not found')
    }

    return toCategoryDto(updated)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const category = await this.categoryRepository.findById(organizationId, id)

    if (!category || !category.isActive) {
      throw notFound('Category not found')
    }

    await this.categoryRepository.softDelete(id)
  }

  private async validateParent(organizationId: string, parentId: string): Promise<void> {
    const parent = await this.categoryRepository.findById(organizationId, parentId)

    if (!parent || !parent.isActive) {
      throw badRequest('Parent category not found')
    }
  }
}
