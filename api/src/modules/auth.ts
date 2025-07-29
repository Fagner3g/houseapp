import { SignJWT } from 'jose'

import { env } from '../env'

export async function AuthenticateUser(userId: string) {
  const secret = new TextEncoder().encode(env.JWT_SECRETT)

  const token = await new SignJWT()
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setExpirationTime('1d')
    .setIssuedAt()
    .sign(secret)

  return token
}
