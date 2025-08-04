import type { FastifyRequest } from 'fastify'

import { listExpenses } from '@/domain/expense/list-expenses'
import type { ListExpensesSchemaParams } from '@/http/schemas/expense/list-expenses.schema'

type Req = FastifyRequest<{ Params: ListExpensesSchemaParams }>

export async function listExpenseController(request: Req) {
  const userId = request.user.sub
  const orgId = request.organization.id

  const { expenses } = await listExpenses({ userId, orgId })

  return { expenses }
}
