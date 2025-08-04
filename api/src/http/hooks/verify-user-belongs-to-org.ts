import type { FastifyRequest } from 'fastify'

import { verifyUserBelongsToOrg } from '@/domain/organization/verify-user-belongs-to-org'
import { ForbiddenError } from '../utils/error'

export async function verifyOrgAccessHook(request: FastifyRequest) {
  const { slug } = request.params as { slug?: string }

  if (!slug) {
    throw new ForbiddenError()
  }

  const org = await verifyUserBelongsToOrg(request, slug)

  if (!org) {
    throw new ForbiddenError('Access denied to this organization.')
  }

  // opcional: deixar o `org.id` disponível no request
  request.organization = org
}
