import { env } from '@/config/env'

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
  image?: string // data URL base64 (apenas mensagens do usuário)
}

export type ProviderName = 'groq' | 'gemini' | 'deepseek'

export interface LLMProvider {
  name: ProviderName
  label: string
  available: boolean
  stream(messages: LLMMessage[], systemPrompt: string): AsyncGenerator<string>
}

// ---------------------------------------------------------------------------
// Helper: formata mensagens para o formato OpenAI (suporta imagens)
// ---------------------------------------------------------------------------
function toOpenAIMessages(messages: LLMMessage[], systemPrompt: string) {
  return [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => {
      if (m.image && m.role === 'user') {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.image } },
          ],
        }
      }
      return { role: m.role, content: m.content }
    }),
  ]
}

// ---------------------------------------------------------------------------
// Helper: OpenAI-compatible streaming (Groq + DeepSeek)
// ---------------------------------------------------------------------------
async function* openAICompatibleStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  systemPrompt: string
): AsyncGenerator<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: toOpenAIMessages(messages, systemPrompt),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`LLM API error (${response.status}): ${err}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body is not readable')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        const chunk = parsed.choices?.[0]?.delta?.content
        if (chunk) yield chunk
      } catch {
        // ignore malformed lines
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Groq (usa Llama 4 Scout quando há imagem, Llama 3.3 70B para texto)
// ---------------------------------------------------------------------------
const groqProvider: LLMProvider = {
  name: 'groq',
  label: 'Groq (Llama)',
  available: !!env.GROQ_API_KEY,
  async *stream(messages, systemPrompt) {
    const hasImage = messages.some(m => m.image)
    const model = hasImage
      ? 'meta-llama/llama-4-scout-17b-16e-instruct'
      : 'llama-3.3-70b-versatile'
    yield* openAICompatibleStream(
      'https://api.groq.com/openai/v1',
      env.GROQ_API_KEY ?? '',
      model,
      messages,
      systemPrompt
    )
  },
}

// ---------------------------------------------------------------------------
// DeepSeek (não suporta visão)
// ---------------------------------------------------------------------------
const deepseekProvider: LLMProvider = {
  name: 'deepseek',
  label: 'DeepSeek V3',
  available: !!env.DEEPSEEK_API_KEY,
  async *stream(messages, systemPrompt) {
    if (messages.some(m => m.image)) {
      throw new Error('DeepSeek não suporta imagens. Use Groq ou Gemini.')
    }
    yield* openAICompatibleStream(
      'https://api.deepseek.com/v1',
      env.DEEPSEEK_API_KEY ?? '',
      'deepseek-chat',
      messages,
      systemPrompt
    )
  },
}

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------
const geminiProvider: LLMProvider = {
  name: 'gemini',
  label: 'Google Gemini 2.0',
  available: !!env.GEMINI_API_KEY,
  async *stream(messages, systemPrompt) {
    const contents = messages.map(m => {
      if (m.image && m.role === 'user') {
        const base64 = m.image.replace(/^data:image\/\w+;base64,/, '')
        const mimeType = m.image.match(/^data:(image\/\w+);/)?.[1] ?? 'image/jpeg'
        return {
          role: 'user',
          parts: [
            { text: m.content },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        }
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }
    })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${env.GEMINI_API_KEY}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7 },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Gemini API error (${response.status}): ${err}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        try {
          const parsed = JSON.parse(data)
          const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
          if (chunk) yield chunk
        } catch {
          // ignore malformed lines
        }
      }
    }
  },
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
const registry: Record<ProviderName, LLMProvider> = {
  groq: groqProvider,
  gemini: geminiProvider,
  deepseek: deepseekProvider,
}

export function getProvider(name: ProviderName): LLMProvider {
  const provider = registry[name]
  if (!provider) throw new Error(`Provedor desconhecido: ${name}`)
  if (!provider.available) throw new Error(`Provedor ${name} não está configurado (API key ausente)`)
  return provider
}

export function listAvailableProviders(): Array<{ name: ProviderName; label: string }> {
  return Object.values(registry)
    .filter(p => p.available)
    .map(p => ({ name: p.name, label: p.label }))
}
