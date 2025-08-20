import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '@/db'
import { users } from '@/db/schemas/users'
import { runReports } from '@/domain/reports/transactions'

export async function runMyTransactionsReport(request: FastifyRequest, reply: FastifyReply) {
  await runReports(request.user.sub)
  return reply.status(202).send()
}

export async function runAllOwnersTransactionsReport(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const rows = await db.select({ id: users.id }).from(users)
  for (const row of rows) {
    await runReports(row.id)
  }
  return reply.status(202).send()
}
