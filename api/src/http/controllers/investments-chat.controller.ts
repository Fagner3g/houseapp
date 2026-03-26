import { Readable } from 'node:stream'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { buildPortfolioContext } from '@/domain/ai/portfolio-context'
import { getProvider, listAvailableProviders } from '@/domain/ai/providers'
import { logger } from '@/lib/logger'

type ChatBody = {
  message: string
  provider: 'groq' | 'gemini' | 'deepseek'
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  image?: string
}

export async function investmentsChatController(
  req: FastifyRequest<{ Body: ChatBody }>,
  reply: FastifyReply
) {
  const { message, provider: providerName, history, image } = req.body

  const provider = getProvider(providerName)
  const systemPrompt = await buildPortfolioContext(req.user.sub)
  const userMessage = image
    ? { role: 'user' as const, content: message, image }
    : { role: 'user' as const, content: message }
  const messages = [...history, userMessage]

  reply.header('Content-Type', 'text/event-stream')
  reply.header('Cache-Control', 'no-cache')
  reply.header('Connection', 'keep-alive')
  reply.header('X-Accel-Buffering', 'no')

  const readable = new Readable({ read() {} })

  // Inicia o streaming em background e alimenta o Readable
  ;(async () => {
    try {
      for await (const chunk of provider.stream(messages, systemPrompt)) {
        readable.push(`data: ${JSON.stringify({ chunk })}\n\n`)
      }
      readable.push('data: [DONE]\n\n')
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error(`Erro no chat IA (${providerName}): ${msg}`)
      readable.push(`data: ${JSON.stringify({ error: msg })}\n\n`)
    } finally {
      readable.push(null)
    }
  })()

  return reply.send(readable)
}

export async function listAiProvidersController(_req: FastifyRequest, reply: FastifyReply) {
  reply.send({ providers: listAvailableProviders() })
}
