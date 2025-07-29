import { env } from '../env'
import { AuthenticateUser } from '../modules/auth'
import { getUser } from './get-user'
import { SendMail } from './send-mail'
import { SendWhats } from './sendWhats'

interface SignInRequest {
  email: string
}

export async function SignIn({ email }: SignInRequest) {
  const user = await getUser({ email })

  if (!user) {
    throw new Error('Usuário não encontrado')
  }

  const token = await AuthenticateUser(user.id)

  const url = new URL(`${env.WEB_URL}/validate-link`)
  url.searchParams.set('token', token)

  await SendMail({ name: user.name, email, ddd: user.ddd, phone: user.phone, url: url.toString() })

  await SendWhats({ name: user.name, ddd: user.ddd, phone: user.phone })
}
