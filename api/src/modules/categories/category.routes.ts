import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  createCategoryController,
  deleteCategoryController,
  getCategoryController,
  listCategoriesController,
  updateCategoryController,
} from './category.controller'
import {
  createCategorySchema,
  deleteCategorySchema,
  getCategorySchema,
  listCategoriesSchema,
  updateCategorySchema,
} from './category.schema'

export const categoriesRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/categories', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listCategoriesSchema,
    handler: listCategoriesController,
  })

  app.post('/organizations/:slug/categories', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createCategorySchema,
    handler: createCategoryController,
  })

  app.get('/organizations/:slug/categories/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getCategorySchema,
    handler: getCategoryController,
  })

  app.patch('/organizations/:slug/categories/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateCategorySchema,
    handler: updateCategoryController,
  })

  app.delete('/organizations/:slug/categories/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteCategorySchema,
    handler: deleteCategoryController,
  })
}
