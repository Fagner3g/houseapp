import { logger } from '@/http/utils/logger'

type SendWhatsRequest = {
  phone: string
  message: string
}

export async function sendWhatsAppMessage({
  phone,
  message,
}: SendWhatsRequest): Promise<{ status: 'sent' | 'error'; error?: string }> {
  const BASE_URL = process.env.EVOLUTION_BASE_URL
  const INSTANCE = process.env.EVOLUTION_INSTANCE
  const API_KEY = process.env.EVOLUTION_API_KEY
  const url = `${BASE_URL}/message/sendText/${INSTANCE}`

  try {
    phone = phone.replace(/\D/g, '') // remove caracteres não numéricos
    if (!phone.startsWith('55')) {
      phone = `55${phone}` // adiciona o prefixo 55 se não tiver normalizedPhone
    }

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
      return { status: 'error', error: errorText }
    }

    return { status: 'sent' }
  } catch (err) {
    logger.error(err)
    if (err instanceof Error) {
      return { status: 'error', error: err.message }
    }
    return { status: 'error', error: 'Unknown error' }
  }
}
