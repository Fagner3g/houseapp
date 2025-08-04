import type { FastifyRequest } from 'fastify'

import { getUser } from '@/domain/user/get-user'
import { signUp } from '@/domain/user/sigin-up'
import type { SignInUpBody } from '@/http/schemas/auth/sign-up.schema'
import { UserAlreadyExistsError } from '@/http/utils/error'

type Req = FastifyRequest<{
  Body: SignInUpBody
}>

export async function sigInUpController(request: Req) {
  const { email, name, phone, ddd, inviteToken } = request.body

  let user = await getUser({ email })

  if (user) {
    throw new UserAlreadyExistsError()
  }

  user = await getUser({ phone })

  if (user) {
    throw new UserAlreadyExistsError()
  }

  await signUp({
    name,
    email,
    phone,
    ddd,
    avatarUrl: `https://robohash.org/${Math.random().toString(36).slice(2)}?size=200x200`,
    inviteToken,
  })
}
