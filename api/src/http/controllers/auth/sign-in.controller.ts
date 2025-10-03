import type { FastifyReply, FastifyRequest } from 'fastify'

import { SignIn } from '@/domain/auth/sign-in'
import type { SignInSchemaBody } from '@/http/schemas/auth/sign-in.schema'
import { BadRequestError } from '@/http/utils/error'
import { logger } from '@/lib/logger'

type Req = FastifyRequest<{ Body: SignInSchemaBody }>

export async function signInController(request: Req, reply: FastifyReply) {
  const { email, phone } = request.body
  if (!email && !phone) throw new BadRequestError('Email or phone is required')

  try {
    await SignIn({ email, phone })
    return reply.status(200).send({ ok: true })
  } catch (e) {
    logger.error(e, 'Sign-in operation failed')
    return reply.status(200).send({ ok: true })
  }
}
