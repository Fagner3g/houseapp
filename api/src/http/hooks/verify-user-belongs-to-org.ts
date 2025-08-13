import type { FastifyRequest } from 'fastify'

import { verifyUserBelongsToOrg } from '@/domain/organization/verify-user-belongs-to-org'
import { ForbiddenError } from '../utils/error'
import { logger } from '../utils/logger'

export async function verifyOrgAccessHook(request: FastifyRequest) {
  const { slug } = request.params as { slug: string }

  if (!slug) {
    logger.error('slug not found')
    throw new ForbiddenError()
  }

  const org = await verifyUserBelongsToOrg(request, slug)

  if (!org) {
    logger.error('Access denied to this organization')
    throw new ForbiddenError('Access denied to this organization.')
  }

  // opcional: deixar o `org.id` disponível no request
  request.organization = org
}
