import type { FastifyReply, FastifyRequest } from 'fastify'

import { completeReminderPeriodWithTransactionService } from '@/domain/alerts/reminders/complete-reminder-period-with-transaction'

export async function completeReminderPeriodWithTransactionController(
  request: FastifyRequest<{
    Params: { slug: string; id: string }
    Body: {
      amount: string
      date?: string
      payToEmail?: string
      description?: string
    }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { id } = request.params
  const { amount, date, payToEmail, description } = request.body

  const result = await completeReminderPeriodWithTransactionService({
    id,
    orgId,
    amount,
    date,
    payToEmail,
    description,
  })

  return reply.status(200).send(result)
}
