import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { invites, userOrganizations } from '@/db/schema'
import { env } from '@/env'
import { AuthenticateUser } from '@/lib/auth'
import { SendMail } from '../send-mail'
import { SendWhats } from '../sendWhats'
import { getUser } from '../user/get-user'

interface SignInRequest {
  email: string
}

export async function SignIn({ email }: SignInRequest) {
  const user = await getUser({ email })

  if (!user) {
    throw new Error('Usuário não encontrado')
  }

  const pendingInvites = await db
    .select()
    .from(invites)
    .where(and(eq(invites.email, email), isNull(invites.acceptedAt)))

  for (const invite of pendingInvites) {
    await db
      .insert(userOrganizations)
      .values({ userId: user.id, organizationId: invite.organizationId })
      .onConflictDoNothing()
    await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id))
  }

  const token = await AuthenticateUser(user.id)

  const url = new URL(`${env.WEB_URL}/validate-link`)
  url.searchParams.set('token', token)

  await SendMail({ name: user.name, email, ddd: user.ddd, phone: user.phone, url: url.toString() })

  await SendWhats({ name: user.name, ddd: user.ddd, phone: user.phone })
}
