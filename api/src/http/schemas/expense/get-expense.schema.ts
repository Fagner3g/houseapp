import z from 'zod'

export const getExpenseSchema = {
  tags: ['Expense'],
  description: 'Get expense by id',
  operationId: 'getExpense',

  params: z.object({
    expenseId: z.string(),
    slug: z.string(),
  }),
  response: {
    200: z.object({
      expense: z
        .object({
          id: z.string(),
          title: z.string(),
          ownerId: z.string(),
          payToId: z.string(),
          amount: z.number(),
          dueDate: z.date(),
          description: z.string().nullable(),
          createdAt: z.date(),
        })
        .nullable(),
    }),
  },
}

export type GetExpenseSchemaParams = z.infer<typeof getExpenseSchema.params>
