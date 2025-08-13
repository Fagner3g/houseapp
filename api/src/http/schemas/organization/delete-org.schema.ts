import { StatusCodes } from 'http-status-codes'
import z from 'zod'

export const deleteOrgSchema = {
  tags: ['Organization'],
  description: 'Delete an organization',
  operationId: 'deleteOrg',
  params: z.object({ slug: z.string().nonempty() }),
  response: { [StatusCodes.OK]: z.null() },
}
