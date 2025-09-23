import fp from 'fastify-plugin'

import { createMailClient, type SendEmailInput, sendEmail } from '@/lib/mail'

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface FastifyInstance {
    mail: {
      sendMail: (data: SendEmailInput) => Promise<void>
    }
  }
}

export default fp(async function mailPlugin(app) {
  const client = createMailClient()
  app.decorate('mail', {
    async sendMail(data: SendEmailInput) {
      await sendEmail(client, data)
    },
  })
})
