import type { FastifyRequest } from 'fastify'

import { getExpense } from '@/domain/expense/get-expense'
import type { GetExpenseSchemaParams } from '@/http/schemas/expense/get-expense.schema'

type Req = FastifyRequest<{ Params: GetExpenseSchemaParams }>

export async function getExpenseController(request: Req) {
  const { expenseId } = request.params

  const { expense } = await getExpense({ id: expenseId })

  return { expense: expense ?? null }
}
