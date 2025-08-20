import { logger } from '@/http/utils/logger'

type SendWhatsRequest = {
  phone: string
  message: string
}

export async function sendWhatsAppMessage({
  phone,
  message,
}: SendWhatsRequest): Promise<{ status: 'sent' | 'error'; phone?: string; error?: string }> {
  const BASE_URL = process.env.EVOLUTION_BASE_URL
  const INSTANCE = process.env.EVOLUTION_INSTANCE
  const API_KEY = process.env.EVOLUTION_API_KEY
  const url = `${BASE_URL}/message/sendText/${INSTANCE}`

  try {
    phone = normalizePhone(phone)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: API_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: phone, text: message }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { status: 'error', error: errorText, phone }
    }

    return { status: 'sent', phone }
  } catch (err) {
    logger.error(err)
    if (err instanceof Error) {
      return { status: 'error', error: err.message }
    }
    return { status: 'error', error: 'Unknown error' }
  }
}

export function normalizePhone(raw: string | null | undefined): string {
  const onlyDigits = String(raw ?? '').replace(/\D/g, '')
  if (!onlyDigits) return ''
  return onlyDigits.startsWith('55') ? onlyDigits : `55${onlyDigits}`
}
