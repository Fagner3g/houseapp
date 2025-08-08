import type { FastifyRequest } from 'fastify'

import { signUp } from '@/domain/auth/sigin-up'
import { getUser } from '@/domain/user/get-user'
import type { SignInUpBody } from '@/http/schemas/auth/sign-up.schema'
import { UserAlreadyExistsError } from '@/http/utils/error'

type Req = FastifyRequest<{ Body: SignInUpBody }>

export async function sigInUpController(request: Req) {
  const { email, name, phone } = request.body

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
    avatarUrl: `https://robohash.org/${Math.random().toString(36).slice(2)}?size=200x200`,
  })
}
