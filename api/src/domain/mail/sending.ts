import nodemailer from 'nodemailer'

import { logger } from '@/http/utils/logger'

export type MailInput = {
  to: string
  subject: string
  text?: string
  html?: string
  from?: string
  headers?: Record<string, string>
  attachments?: Array<{
    filename?: string
    content?: string | Buffer
    path?: string
    contentType?: string
  }>
}

let _transporter: nodemailer.Transporter | null = null
let warnedFallback = false

function getEnvBool(name: string, def = false) {
  const v = process.env[name]
  if (v == null) return def
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase())
}

export function getTransporter() {
  if (_transporter) return _transporter

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const secure = getEnvBool('SMTP_SECURE', false)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (host && port) {
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user || pass ? { user, pass } : undefined,
    })
  } else {
    // Fallback para DEV: não tenta conectar, apenas imprime o e-mail em JSON
    _transporter = nodemailer.createTransport({ jsonTransport: true })
    if (!warnedFallback) {
      warnedFallback = true
      // eslint-disable-next-line no-console
      logger.warn('[mail] SMTP_HOST/PORT ausentes — usando jsonTransport (DEV).')
    }
  }

  return _transporter
}

/**
 * Envia e-mail de forma genérica usando Nodemailer.
 * - Usa MAIL_FROM por padrão (ou no-reply@houseapp.local)
 * - Em DEV, sem SMTP configurado, apenas loga o conteúdo (jsonTransport)
 */
export async function sendMail({ to, subject, text, html, from, headers, attachments }: MailInput) {
  const transporter = getTransporter()
  const MAIL_FROM = from ?? process.env.MAIL_FROM ?? 'no-reply@houseapp.local'

  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
    headers,
    attachments,
  })

  return info
}

/**
 * Helper para teste rápido de configuração. Não usar em produção.
 */
export async function sendTestMail(address: string) {
  return sendMail({
    to: address,
    subject: 'HouseApp • Teste de E-mail',
    text: 'Se você recebeu esta mensagem, o transporte de e-mail está OK. ✅',
  })
}
