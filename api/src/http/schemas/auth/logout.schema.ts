import z from 'zod'

export const logoutSchema = {
  tags: ['Auth'],
  description: 'Logout revoke token',
  operationId: 'logout',
  headers: z.object({
    authorization: z.string(),
  }),
}
