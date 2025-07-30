import { env } from '@/env'
import { AuthenticateUser } from '@/modules/auth'
import { SendMail } from '../send-mail'
import { SendWhats } from '../sendWhats'

interface CreateNewUserRequest {
  name: string
  email: string
  ddd: string
  phone: string
  avatarUrl: string
}

export async function createNewUser({ name, email, ddd, phone, avatarUrl }: CreateNewUserRequest) {
  const token = await AuthenticateUser(email)

  const url = new URL(`${env.WEB_URL}/validate-link`)
  url.searchParams.set('token', token)

  await SendMail({ name, email, ddd, phone, url: url.toString() })

  await SendWhats({ name, ddd, phone })
}
