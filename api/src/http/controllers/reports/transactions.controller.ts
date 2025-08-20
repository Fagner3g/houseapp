import type { FastifyReply, FastifyRequest } from 'fastify'

import { runReports } from '@/domain/reports/transactions'
import { db } from '@/db'
import { users } from '@/db/schemas/users'

export async function runMyTransactionsReport(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await runReports(request.user.sub)
  return reply.status(202).send()
}

export async function runAllOwnersTransactionsReport(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const rows = await db.select({ id: users.id }).from(users)
  for (const row of rows) {
    await runReports(row.id)
  }
  return reply.status(202).send()
}
