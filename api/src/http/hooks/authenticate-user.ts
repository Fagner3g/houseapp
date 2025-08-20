import type { FastifyRequest } from 'fastify'

import { isTokenRevoked } from '../utils/auth'
import { UnauthorizedError } from '../utils/error'

export async function authenticateUserHook(request: FastifyRequest) {
  try {
    await request.jwtVerify()
    const auth = request.headers.authorization
    const token = auth?.replace('Bearer ', '')
    if (token && isTokenRevoked(token)) {
      throw new Error()
    }
  } catch {
    throw new UnauthorizedError()
  }
}
