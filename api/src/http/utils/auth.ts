import { jwtVerify, SignJWT } from 'jose'

import { env } from '@/config/env'

const secret = new TextEncoder().encode(env.JWT_SECRET)

export async function VerifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret)

  return payload
}

export async function AuthenticateUser(userId: string) {
  const token = await new SignJWT()
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setExpirationTime('1d')
    .setIssuedAt()
    .sign(secret)

  return token
}
