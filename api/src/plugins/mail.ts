import fp from 'fastify-plugin'

import { createMailClient, type SendEmailInput, sendEmail } from '@/lib/mail'
import type { TransactionalEmailsApi } from '@getbrevo/brevo'

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface FastifyInstance {
    mail: {
      sendMail: (data: SendEmailInput) => Promise<void>
    }
  }
}

export default fp(async function mailPlugin(app) {
  let client: TransactionalEmailsApi | null = null

  const getClient = () => {
    if (!client) {
      client = createMailClient()
    }
    return client
  }

  app.decorate('mail', {
    async sendMail(data: SendEmailInput) {
      await sendEmail(getClient(), data)
    },
  })
})
