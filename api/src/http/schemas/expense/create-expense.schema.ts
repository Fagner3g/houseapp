import z from 'zod'

export const createExpenseSchema = {
  tags: ['Expense'],
  description: 'Create an expense',
  operationId: 'createExpense',
  params: z.object({ slug: z.string() }),
  body: z.object({
    title: z.string(),
    payToId: z.string(),
    amount: z.number(),
    dueDate: z.string(),
    description: z.string().optional(),
  }),
  response: {
    201: z.null(),
  },
}

export type CreateExpenseSchemaParams = z.infer<typeof createExpenseSchema.params>
export type CreateExpenseSchemaBody = z.infer<typeof createExpenseSchema.body>
