import z from 'zod'

export const logoutSchema = {
  tags: ['Auth'],
  description: 'Sign out revoke token',
  operationId: 'signOut',
  headers: z.object({
    authorization: z.string(),
  }),
}
