import type { FastifyInstance } from 'fastify'

import { env } from '@/config/env'

interface SendInviteMailRequest {
  email: string
  url: string
}

export async function sendInviteMail(app: FastifyInstance, { email, url }: SendInviteMailRequest) {
  await app.mail.sendMail({
    from: {
      email: env.MAIL_FROM_EMAIL || 'no-reply@houseapp.local',
      name: env.MAIL_FROM_NAME || 'HouseApp',
    },
    to: email,
    subject: 'Convite para o House App',
    html: `Clique <a href="${url}">aqui</a> para aceitar o convite`,
  })
}
