import type { FastifyRequest } from 'fastify'

import { verifyUserBelongsToOrg } from '@/domain/organization/verify-user-belongs-to-org'
import { logger } from '../../lib/logger'
import { ForbiddenError } from '../utils/error'

export async function verifyOrgAccessHook(request: FastifyRequest) {
  const { slug } = request.params as { slug: string }

  if (!slug) {
    logger.error('Organization slug not found in request params')
    throw new ForbiddenError()
  }

  const org = await verifyUserBelongsToOrg(request, slug)

  if (!org) {
    logger.error({ slug }, 'Access denied to organization')
    throw new ForbiddenError('Access denied to this organization.')
  }

  // opcional: deixar o `org.id` disponível no request
  request.organization = org
}
