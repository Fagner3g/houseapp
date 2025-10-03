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

  if (!BASE_URL || !INSTANCE || !API_KEY) {
    return {
      status: 'error',
      error: 'WhatsApp API configuration missing',
      phone,
    }
  }

  const url = `${BASE_URL}/message/sendText/${INSTANCE}`
  phone = normalizePhone(phone)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: phone, text: message }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        status: 'error',
        error: `HTTP ${response.status}: ${errorText}`,
        phone,
      }
    }

    return { status: 'sent', phone }
  } catch (error) {
    // Erro de rede/conectividade
    if (error instanceof TypeError && error.message === 'fetch failed') {
      return {
        status: 'error',
        error: `Network error: Unable to connect to WhatsApp API`,
        phone,
      }
    }

    // Outros erros
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      phone,
    }
  }
}

export function normalizePhone(raw: string | null | undefined): string {
  const onlyDigits = String(raw ?? '').replace(/\D/g, '')
  if (!onlyDigits) return ''
  return onlyDigits.startsWith('55') ? onlyDigits : `55${onlyDigits}`
}
