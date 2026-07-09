import type { FastifyReply, FastifyRequest } from 'fastify'

import { aiService } from './ai.service'
import type { AiActionBody, AiChatBody } from './ai.schema'

type OrgParams = { slug: string }

export async function listAiProvidersController(
  _request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const providers = aiService.listProviders()
  return reply.send({ providers })
}

export async function aiChatController(
  request: FastifyRequest<{ Params: OrgParams; Body: AiChatBody }>,
  reply: FastifyReply
) {
  const { message, history, provider } = request.body

  reply.hijack()
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const sendEvent = (event: object) => {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  try {
    for await (const event of aiService.streamChat({
      organizationId: request.organization.id,
      userId: request.user.sub,
      message,
      history,
      provider,
    })) {
      sendEvent(event)
    }

    reply.raw.write('data: [DONE]\n\n')
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Erro ao processar chat'
    sendEvent({ type: 'error', message: messageText })
    reply.raw.write('data: [DONE]\n\n')
  } finally {
    reply.raw.end()
  }
}

export async function confirmAiActionController(
  request: FastifyRequest<{ Params: OrgParams; Body: AiActionBody }>,
  reply: FastifyReply
) {
  const result = await aiService.confirmAction(
    request.body.actionId,
    request.user.sub,
    request.organization.id
  )

  return reply.send(result)
}

export async function rejectAiActionController(
  request: FastifyRequest<{ Params: OrgParams; Body: AiActionBody }>,
  reply: FastifyReply
) {
  const result = aiService.rejectAction(
    request.body.actionId,
    request.user.sub,
    request.organization.id
  )

  return reply.send(result)
}
