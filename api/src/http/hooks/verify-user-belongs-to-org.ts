import type { FastifyRequest } from 'fastify'

import { verifyUserBelongsToOrg } from '@/domain/organization/verify-user-belongs-to-org'
import { logger } from '../../lib/logger'
import { ForbiddenError } from '../utils/error'

export async function verifyOrgAccessHook(request: FastifyRequest) {
  try {
    logger.info({ slug: (request.params as { slug?: string })?.slug }, '🔍 HOOK verifyOrgAccessHook - ENTER')
    
    const { slug } = request.params as { slug: string }

    if (!slug) {
      logger.error('slug not found')
      throw new ForbiddenError()
    }

    logger.info({ slug }, '🔍 HOOK - Chamando verifyUserBelongsToOrg')
    const org = await verifyUserBelongsToOrg(request, slug)

    if (!org) {
      logger.error('Hook Error: Access denied to this organization')
      throw new ForbiddenError('Access denied to this organization.')
    }

    logger.info({ orgId: org.id, slug }, '🔍 HOOK - Sucesso, org encontrada')
    // opcional: deixar o `org.id` disponível no request
    request.organization = org
  } catch (error) {
    logger.error({ error, stack: error instanceof Error ? error.stack : 'N/A' }, '❌ HOOK verifyOrgAccessHook - ERRO')
    throw error
  }
}
