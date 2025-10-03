import { env } from '@/config/env'
import { db } from '@/db'
import { users } from '@/db/schemas/users'
import { AuthenticateUser } from '@/http/utils/auth'
// Removido auto-create de organização na criação de usuário
import { SendMail } from '../send-mail'

interface CreateNewUserRequest {
  name: string
  email: string
  phone: string
  avatarUrl: string
}

export async function signUp({ name, email, phone, avatarUrl }: CreateNewUserRequest) {
  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      avatarUrl,
    })
    .returning()

  const token = await AuthenticateUser(user.id)

  const webUrl = env.WEB_URL.replace(/\/+$/, '')
  const url = new URL(`${webUrl}/validate`)
  url.searchParams.set('token', token)

  await SendMail({ name, email, phone, url: url.toString() })
}
