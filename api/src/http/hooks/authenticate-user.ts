import type { FastifyRequest } from 'fastify'

import { logger } from '../../lib/logger'
import { isTokenRevoked } from '../utils/auth'
import { UnauthorizedError } from '../utils/error'

export async function authenticateUserHook(request: FastifyRequest) {
  try {
    await request.jwtVerify()
    const auth = request.headers.authorization
    const token = auth?.replace('Bearer ', '')

    if (token && isTokenRevoked(token)) {
      logger.info(`Token revoked: ${token}`)
      throw new UnauthorizedError()
    }
  } catch {
    throw new UnauthorizedError()
  }
}
