import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'
import type { CreateCategoryBody, UpdateCategoryBody } from './category.schema'

type OrgParams = { slug: string }
type CategoryParams = OrgParams & { id: string }

export async function listCategoriesController(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const categories = await container.categoryService.list(request.organization.id)
  return reply.send({ categories })
}

export async function getCategoryController(
  request: FastifyRequest<{ Params: CategoryParams }>,
  reply: FastifyReply
) {
  const category = await container.categoryService.get(request.organization.id, request.params.id)
  return reply.send({ category })
}

export async function createCategoryController(
  request: FastifyRequest<{ Params: OrgParams; Body: CreateCategoryBody }>,
  reply: FastifyReply
) {
  const category = await container.categoryService.create(request.organization.id, request.body)
  return reply.status(StatusCodes.CREATED).send({ category })
}

export async function updateCategoryController(
  request: FastifyRequest<{ Params: CategoryParams; Body: UpdateCategoryBody }>,
  reply: FastifyReply
) {
  const category = await container.categoryService.update(
    request.organization.id,
    request.params.id,
    request.body
  )

  return reply.send({ category })
}

export async function deleteCategoryController(
  request: FastifyRequest<{ Params: CategoryParams }>,
  reply: FastifyReply
) {
  await container.categoryService.delete(request.organization.id, request.params.id)
  return reply.status(StatusCodes.NO_CONTENT).send()
}
