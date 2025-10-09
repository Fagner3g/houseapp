import { and, eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '@/db'
import { transactionChatMessages } from '@/db/schemas/transactionChatMessages'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { users } from '@/db/schemas/users'
import { logger } from '@/lib/logger'
import type {
  CreateChatMessageSchemaBody,
  CreateChatMessageSchemaParams,
} from '../../schemas/transaction/create-chat-message.schema'

export async function createChatMessageController(
  request: FastifyRequest<{
    Params: CreateChatMessageSchemaParams
    Body: CreateChatMessageSchemaBody
  }>,
  reply: FastifyReply
) {
  try {
    const { transactionId } = request.params
    const { message } = request.body

    const userId = request.user.sub
    const org = request.organization

    const [transaction] = await db
      .select()
      .from(transactionOccurrences)
      .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
      .where(
        and(
          eq(transactionOccurrences.id, transactionId),
          eq(transactionSeries.organizationId, org.id)
        )
      )
      .limit(1)

    if (!transaction) {
      return reply.status(404).send({ message: 'Transação não encontrada' })
    }

    const [newMessage] = await db
      .insert(transactionChatMessages)
      .values({
        transactionId,
        userId,
        organizationId: org.id,
        message,
      })
      .returning()

    // Buscar mensagem criada com informações do usuário
    const messageWithUser = await db
      .select({
        id: transactionChatMessages.id,
        message: transactionChatMessages.message,
        createdAt: transactionChatMessages.createdAt,
        updatedAt: transactionChatMessages.updatedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(transactionChatMessages)
      .innerJoin(users, eq(transactionChatMessages.userId, users.id))
      .where(eq(transactionChatMessages.id, newMessage.id))
      .limit(1)

    return reply.status(201).send(messageWithUser[0])
  } catch (error) {
    logger.error('Error creating chat message:', error)
    return reply.status(400).send({ message: 'Error creating chat message' })
  }
}
