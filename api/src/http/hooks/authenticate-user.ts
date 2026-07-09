import type { FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schemas/users'
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

    const userId = request.user.sub
    if (!userId) {
      throw new UnauthorizedError()
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (!user) {
      logger.warn({ userId }, 'JWT references user that no longer exists — session stale')
      throw new UnauthorizedError('Session expired. Please sign in again.')
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error
    }
    logger.error({ error, method: request.method, url: request.url }, 'Authentication failed')
    throw new UnauthorizedError()
  }
}
