import type { FastifyInstance } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { env } from '@/config/env'
import {
  BadRequestError,
  ForbiddenError,
  TagAlreadyExistsError,
  UnauthorizedError,
  UserAlreadyExistsError,
} from '.'

type FastifyErrorHandler = FastifyInstance['errorHandler']

export const errorHandler: FastifyErrorHandler = (error, _request, reply) => {
  if (error.code === 'FST_ERR_VALIDATION' && error.validation) {
    return reply.status(StatusCodes.BAD_REQUEST).send({
      message: 'Validation error',
      errors: error.validation.map(({ instancePath, message }) => ({
        [instancePath.replace(/^\//, '')]: message,
      })),
    })
  }

  const errorMap = new Map([
    [BadRequestError, StatusCodes.BAD_REQUEST],
    [UnauthorizedError, StatusCodes.UNAUTHORIZED],
    [ForbiddenError, StatusCodes.FORBIDDEN],
    [UserAlreadyExistsError, StatusCodes.CONFLICT],
    [TagAlreadyExistsError, StatusCodes.CONFLICT],
  ])

  for (const [ErrorType, status] of errorMap) {
    if (error instanceof ErrorType) {
      return reply.status(status).send({ message: error.message })
    }
  }

  if (env.NODE_ENV !== 'production') {
    console.error(error)
  }

  return reply.status(500).send({ message: 'Internal server error' })
}
