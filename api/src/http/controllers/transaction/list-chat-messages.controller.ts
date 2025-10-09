import { and, count, desc, eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '@/db'
import { transactionChatMessages } from '@/db/schemas/transactionChatMessages'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { users } from '@/db/schemas/users'
import type {
  ListChatMessagesSchemaParams,
  ListChatMessagesSchemaQuerystring,
} from '../../schemas/transaction/list-chat-messages.schema'

export async function listChatMessagesController(
  request: FastifyRequest<{
    Params: ListChatMessagesSchemaParams
    Querystring: ListChatMessagesSchemaQuerystring
  }>,
  reply: FastifyReply
) {
  try {
    const { transactionId } = request.params
    const { page, perPage } = request.query

    const offset = (page - 1) * perPage

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

    const messages = await db
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
      .where(eq(transactionChatMessages.transactionId, transactionId))
      .orderBy(desc(transactionChatMessages.createdAt))
      .limit(perPage)
      .offset(offset)

    // Contar total de mensagens
    const [totalResult] = await db
      .select({ count: count() })
      .from(transactionChatMessages)
      .where(eq(transactionChatMessages.transactionId, transactionId))

    const total = totalResult?.count || 0
    const totalPages = Math.ceil(total / perPage)

    return reply.send({
      messages: messages.reverse(), // Ordenar do mais antigo para o mais recente
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Erro ao listar mensagens do chat:', error)
    return reply.status(500).send({ message: 'Erro interno do servidor' })
  }
}
