import { createFileRoute, redirect } from '@tanstack/react-router'
import z from 'zod'

export const Route = createFileRoute('/_app/$org/credit-cards')({
  validateSearch: z.object({
    accountId: z.string().optional(),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  }),
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/$org/accounts',
      params: { org: params.org },
      search: {
        accountId: search.accountId,
        month: search.month,
      },
    })
  },
})
