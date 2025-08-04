import type { FastifyReply, FastifyRequest } from 'fastify'

import { createExpense } from '@/domain/expense/create-expense'
import type {
  CreateExpenseSchemaBody,
  CreateExpenseSchemaParams,
} from '@/http/schemas/expense/create-expense.schema'

type Req = FastifyRequest<{ Params: CreateExpenseSchemaParams; Body: CreateExpenseSchemaBody }>

export async function createExpenseController(request: Req, reply: FastifyReply) {
  const slug = request.organization.id
  const { title, payToId, amount, dueDate, description } = request.body

  const ownerId = request.user.sub

  await createExpense({
    title,
    ownerId,
    payToId,
    organizationSlug: slug,
    amount,
    dueDate: new Date(dueDate),
    description,
  })

  return reply.status(201).send()
}
