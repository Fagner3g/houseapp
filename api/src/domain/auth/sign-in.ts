import { and, eq, isNull } from 'drizzle-orm'

import { env } from '@/config/env'
import { db } from '@/db'
import { invites } from '@/db/schemas/invites'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { AuthenticateUser } from '@/http/utils/auth'
import { SendMail } from '../send-mail'
import { getUser } from '../user/get-user'
import { normalizePhone, sendWhatsAppMessage } from '../whatsapp'

interface SignInRequest {
  email?: string
  phone?: string
}

export async function SignIn({ email, phone }: SignInRequest) {
  const normalizedPhone = phone?.replace(/\D/g, '')
  const user = await getUser({ email: email ?? undefined, phone: normalizedPhone })

  if (!user) {
    throw new Error(`user not found`)
  }

  // If logging by phone, use the user's email to consume pending invites
  if (user.email) {
    const pendingInvites = await db
      .select()
      .from(invites)
      .where(and(eq(invites.email, user.email), isNull(invites.acceptedAt)))

    for (const invite of pendingInvites) {
      await db
        .insert(userOrganizations)
        .values({ userId: user.id, organizationId: invite.organizationId })
        .onConflictDoNothing()
      await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id))
    }
  }

  const token = await AuthenticateUser(user.id)

  const url = new URL(`${env.WEB_URL}/validate`)
  url.searchParams.set('token', token)

  // Deliver the magic link only through the requested channel
  // If the client sent an e-mail, prefer e-mail delivery
  if (email) {
    await SendMail({ name: user.name, email: user.email, phone: user.phone, url: url.toString() })
    return
  }

  // If the client sent a phone number, deliver via WhatsApp only
  if (phone) {
    const targetPhone = normalizedPhone || normalizePhone(user.phone)
    if (targetPhone) {
      const message = `Olá ${user.name?.split(' ')[0] || ''}!\n\nAcesse seu painel clicando no link:\n<${url.toString()}>\n\nSe não foi você, ignore esta mensagem.`
      await sendWhatsAppMessage({ phone: targetPhone, message })
    }
    return
  }

  // Fallback: if no explicit channel sent (legacy clients), keep previous behavior
  await SendMail({ name: user.name, email: user.email, phone: user.phone, url: url.toString() })
}
