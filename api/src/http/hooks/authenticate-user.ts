import type { FastifyRequest } from 'fastify'

import { isTokenRevoked } from '../utils/auth'
import { UnauthorizedError } from '../utils/error'
import { logger } from '../utils/logger'

export async function authenticateUserHook(request: FastifyRequest) {
  try {
    console.log('authenticateUserHook')
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
