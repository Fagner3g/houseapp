import z from 'zod'

export const listExpensesSchema = {
  tags: ['Expense'],
  description: 'List expenses for authenticated user',
  operationId: 'listExpenses',
  params: z.object({ slug: z.string().nonempty() }),
  response: {
    200: z.object({
      expenses: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          ownerId: z.string(),
          payToId: z.string(),
          amount: z.number(),
          dueDate: z.date(),
          description: z.string().nullable(),
          createdAt: z.date(),
        })
      ),
    }),
  },
}

export type ListExpensesSchemaParams = z.infer<typeof listExpensesSchema.params>
