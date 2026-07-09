import z from 'zod'

export const categoryResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  type: z.enum(['income', 'expense']),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  parentId: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const slugParams = z.object({ slug: z.string() })
const categoryParams = slugParams.extend({ id: z.string() })

const createCategoryBody = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']).optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
})

const updateCategoryBody = createCategoryBody.partial()

export const listCategoriesSchema = {
  tags: ['Categories'],
  description: 'List organization categories',
  operationId: 'listCategories',
  params: slugParams,
  response: {
    200: z.object({ categories: z.array(categoryResponseSchema) }),
  },
}

export const getCategorySchema = {
  tags: ['Categories'],
  description: 'Get category by id',
  operationId: 'getCategory',
  params: categoryParams,
  response: {
    200: z.object({ category: categoryResponseSchema }),
  },
}

export const createCategorySchema = {
  tags: ['Categories'],
  description: 'Create category',
  operationId: 'createCategory',
  params: slugParams,
  body: createCategoryBody,
  response: {
    201: z.object({ category: categoryResponseSchema }),
  },
}

export const updateCategorySchema = {
  tags: ['Categories'],
  description: 'Update category',
  operationId: 'updateCategory',
  params: categoryParams,
  body: updateCategoryBody,
  response: {
    200: z.object({ category: categoryResponseSchema }),
  },
}

export const deleteCategorySchema = {
  tags: ['Categories'],
  description: 'Soft-delete category',
  operationId: 'deleteCategory',
  params: categoryParams,
  response: {
    204: z.null(),
  },
}

export type CreateCategoryBody = z.infer<typeof createCategoryBody>
export type UpdateCategoryBody = z.infer<typeof updateCategoryBody>
