import { and, eq, isNull, or } from 'drizzle-orm'

import { normalizePhoneDigits } from '@/core/phone'
import { env } from '@/config/env'
import { db } from '@/db'
import { invites } from '@/db/schemas/invites'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import { organizations } from '@/db/schemas/organizations'
import { users } from '@/db/schemas/users'
import { SendMail } from '@/domain/send-mail'
import { getUser } from '@/domain/user/get-user'
import { normalizePhone, sendWhatsAppMessage } from '@/domain/whatsapp'
import { AuthenticateUser, VerifyToken, revokeToken } from '@/http/utils/auth'
import { UnauthorizedError } from '@/http/utils/error'

export type SignInInput = {
  email?: string
  phone?: string
}

export type SignUpInput = {
  name: string
  email: string
  phone: string
  avatarUrl: string
}

export class AuthService {
  async signIn({ email, phone }: SignInInput): Promise<void> {
    const normalizedPhone = phone?.replace(/\D/g, '')
    const user = await getUser({ email: email ?? undefined, phone: normalizedPhone })

    if (!user) {
      throw new Error('user not found')
    }

    if (user.email) {
      const pendingInvites = await db
        .select()
        .from(invites)
        .where(and(eq(invites.email, user.email), isNull(invites.acceptedAt)))

      for (const invite of pendingInvites) {
        await db
          .insert(organizationMembers)
          .values({ userId: user.id, organizationId: invite.organizationId })
          .onConflictDoNothing()
        await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id))
      }
    }

    const token = await AuthenticateUser(user.id)
    const webUrl = env.WEB_URL.replace(/\/+$/, '')
    const url = new URL(`${webUrl}/validate`)
    url.searchParams.set('token', token)

    if (email) {
      await SendMail({
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        url: url.toString(),
      })
      return
    }

    if (phone) {
      const targetPhone = normalizedPhone || normalizePhone(user.phone)
      if (targetPhone) {
        const message = `Olá ${user.name?.split(' ')[0] || ''}!\n\nAcesse seu painel clicando no link:\n${url.toString()}\n\nSe não foi você, ignore esta mensagem.`
        const result = await sendWhatsAppMessage({ phone: targetPhone, message })

        if (result.status === 'error') {
          throw new Error(`WhatsApp delivery failed: ${result.error}`)
        }
      }
      return
    }

    await SendMail({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      url: url.toString(),
    })
  }

  async signUp({ name, email, phone, avatarUrl }: SignUpInput): Promise<void> {
    const phoneDigits = normalizePhoneDigits(phone)

    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        phone: phoneDigits,
        avatarUrl,
      })
      .returning()

    const token = await AuthenticateUser(user.id)
    const webUrl = env.WEB_URL.replace(/\/+$/, '')
    const url = new URL(`${webUrl}/validate`)
    url.searchParams.set('token', token)

    await SendMail({ name, email, phone: phoneDigits, url: url.toString() })
  }

  async completeProfile({
    name,
    email,
    phone,
  }: {
    name: string
    email: string
    phone: string
  }): Promise<void> {
    const phoneDigits = normalizePhoneDigits(phone)

    const [updated] = await db
      .update(users)
      .set({ name, phone: phoneDigits })
      .where(
        and(
          eq(users.email, email),
          or(isNull(users.phone), eq(users.phone, ''))
        )
      )
      .returning()

    if (!updated) {
      throw new Error('profile already complete')
    }

    await this.signIn({ email })
  }

  async validateToken(token: string): Promise<{ valid: true; slug: string | null }> {
    try {
      const payload = await VerifyToken(token)

      if (!payload.sub) {
        throw new UnauthorizedError()
      }

      const [org] = await db
        .select({ slug: organizations.slug })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, payload.sub))
        .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
        .limit(1)

      if (org?.slug) {
        return { valid: true, slug: org.slug }
      }

      const [owned] = await db
        .select({ slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.ownerId, payload.sub))
        .limit(1)

      return { valid: true, slug: owned?.slug ?? null }
    } catch {
      throw new UnauthorizedError()
    }
  }

  logout(token: string | undefined): void {
    if (token) {
      revokeToken(token)
    }
  }
}
