import type { FastifyRequest } from 'fastify'

import { logger } from '../../lib/logger'
import { isTokenRevoked } from '../utils/auth'
import { UnauthorizedError } from '../utils/error'

export async function authenticateUserHook(request: FastifyRequest) {
  try {
    logger.info({ method: request.method, url: request.url }, '🔐 HOOK authenticateUserHook - ENTER')
    
    await request.jwtVerify()
    const auth = request.headers.authorization
    const token = auth?.replace('Bearer ', '')

    if (token && isTokenRevoked(token)) {
      logger.info(`Token revoked: ${token}`)
      throw new UnauthorizedError()
    }
    
    logger.info({ userId: request.user?.sub }, '🔐 HOOK authenticateUserHook - Sucesso')
  } catch (error) {
    logger.error({ error, stack: error instanceof Error ? error.stack : 'N/A' }, '❌ HOOK authenticateUserHook - ERRO')
    throw new UnauthorizedError()
  }
}
