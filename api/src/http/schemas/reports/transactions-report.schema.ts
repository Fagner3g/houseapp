import z from 'zod'

export const runMyTransactionsReportSchema = {
  tags: ['Reports'],
  description: 'Trigger transactions report for authenticated user',
  operationId: 'runMyTransactionsReport',
  params: z.object({}),
  response: { 202: z.null() },
}

export const runAllOwnersTransactionsReportSchema = {
  tags: ['Reports'],
  description: 'Trigger transactions report for all owners',
  operationId: 'runAllOwnersTransactionsReport',
  params: z.object({}),
  response: { 202: z.null() },
}
