import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'
import { normalizePhoneDigits } from '@/core/phone'
import { getUser } from '@/domain/user/get-user'
import { BadRequestError, UserAlreadyExistsError } from '@/http/utils/error'
import { logger } from '@/lib/logger'

import type { SignInBody, SignUpBody, ValidateTokenBody } from './auth.schema'

export async function signInController(
  request: FastifyRequest<{ Body: SignInBody }>,
  reply: FastifyReply
) {
  const { email, phone } = request.body

  if (!email && !phone) {
    throw new BadRequestError('Email or phone is required')
  }

  try {
    await container.authService.signIn({ email, phone })
    return reply.status(200).send({ ok: true })
  } catch (error) {
    logger.error(error, 'Sign-in operation failed')

    if (error instanceof Error && error.message === 'user not found') {
      throw new BadRequestError(
        'Usuário não encontrado. Cadastre-se com seu telefone ou entre com e-mail.'
      )
    }

    throw new BadRequestError('Não foi possível enviar o link de acesso')
  }
}

export async function signUpController(
  request: FastifyRequest<{ Body: SignUpBody }>,
  reply: FastifyReply
) {
  const { email, name, phone } = request.body
  const phoneDigits = normalizePhoneDigits(phone)

  try {
    const existingByEmail = await getUser({ email })

    if (existingByEmail) {
      const hasPhone = !!normalizePhoneDigits(existingByEmail.phone)

      if (!hasPhone) {
        const existingByPhone = await getUser({ phone: phoneDigits })

        if (existingByPhone && existingByPhone.id !== existingByEmail.id) {
          throw new UserAlreadyExistsError('Este telefone já está em outra conta')
        }

        await container.authService.completeProfile({ name, email, phone: phoneDigits })
        return reply.status(StatusCodes.CREATED).send()
      }

      throw new UserAlreadyExistsError('Já existe uma conta com este e-mail. Faça login.')
    }

    const existingByPhone = await getUser({ phone: phoneDigits })

    if (existingByPhone) {
      throw new UserAlreadyExistsError('Este telefone já está cadastrado')
    }

    await container.authService.signUp({
      name,
      email,
      phone: phoneDigits,
      avatarUrl: `https://robohash.org/${Math.random().toString(36).slice(2)}?size=200x200`,
    })

    return reply.status(StatusCodes.CREATED).send()
  } catch (error) {
    logger.error(error)

    if (error instanceof UserAlreadyExistsError) {
      throw error
    }

    throw new BadRequestError(String(error))
  }
}

export async function validateTokenController(
  request: FastifyRequest<{ Body: ValidateTokenBody }>,
  reply: FastifyReply
) {
  const result = await container.authService.validateToken(request.body.token)
  return reply.status(200).send(result)
}

export async function logoutController(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization
  const token = auth?.replace('Bearer ', '')
  container.authService.logout(token)
  return reply.status(200).send()
}
