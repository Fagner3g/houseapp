import * as Brevo from '@getbrevo/brevo'

import { env } from '@/config/env'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: { email: string; name?: string }
}

export function createMailClient() {
  const apiInstance = new Brevo.TransactionalEmailsApi()
  const apiKey = env.BREVO_API_KEY
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not set')
  }
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey)
  return apiInstance
}

export async function sendEmail(client: Brevo.TransactionalEmailsApi, data: SendEmailInput) {
  const { to, subject, html, text, from } = data

  const sender = {
    email: from?.email || env.MAIL_FROM_EMAIL || 'no-reply@houseapp.local',
    name: from?.name || env.MAIL_FROM_NAME || 'HouseApp',
  }

  const recipients = (Array.isArray(to) ? to : [to]).map(email => ({ email }))

  return await client.sendTransacEmail({
    sender,
    to: recipients,
    subject,
    htmlContent: html,
    textContent: text,
  })
}

// Campaigns (Brevo EmailCampaignsApi)
type CreateCampaignInput = {
  name: string
  subject: string
  htmlContent: string
  listIds: number[]
  scheduledAt?: string // 'YYYY-MM-DD HH:mm:ss'
  sender?: { email: string; name?: string }
}

export async function createEmailCampaign(
  client: Brevo.EmailCampaignsApi,
  input: CreateCampaignInput
) {
  const { name, subject, htmlContent, listIds, scheduledAt, sender } = input
  const payload: Brevo.CreateEmailCampaign = {
    name,
    subject,
    sender: {
      email: sender?.email || env.MAIL_FROM_EMAIL || 'no-reply@jarvis.dev.br',
      name: sender?.name || env.MAIL_FROM_NAME || 'HouseApp',
    },
    htmlContent,
    recipients: { listIds },
    scheduledAt,
  }
  return await client.createEmailCampaign(payload)
}

export function createCampaignClient() {
  const api = new Brevo.EmailCampaignsApi()
  const apiKey = env.BREVO_API_KEY
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not set')
  }
  api.setApiKey(Brevo.EmailCampaignsApiApiKeys.apiKey, apiKey)
  return api
}
