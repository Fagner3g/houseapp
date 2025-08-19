import nodemailer from 'nodemailer'
import { env } from '@/config/env'

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
})

interface SendOptions {
  to: string
  subject: string
  text: string
}

export const mailer = {
  async send({ to, subject, text }: SendOptions) {
    await transport.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      text,
    })
  },
}
