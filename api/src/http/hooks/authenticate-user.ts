import type { FastifyRequest } from 'fastify'

import { UnauthorizedError } from '../utils/error'

export async function authenticateUserHook(request: FastifyRequest) {
  try {
    await request.jwtVerify()
  } catch {
    throw new UnauthorizedError()
  }
}
