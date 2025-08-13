import type { FastifyReply, FastifyRequest } from 'fastify'

import { SignIn } from '@/domain/auth/sign-in'
import type { SignInSchemaBody } from '@/http/schemas/auth/sign-in.schema'

type Req = FastifyRequest<{ Body: SignInSchemaBody }>

export async function signInController(request: Req, reply: FastifyReply) {
  const { email } = request.body

  if (!email) {
    return reply.status(400).send()
  }

  try {
    await SignIn({ email })
  } catch {
    return reply.status(200).send(null)
  }

  return reply.status(200).send(null)
}
