import z from 'zod'

export const createInviteSchema = {
  tags: ['Invite'],
  description: 'Create invite to organization',
  operationId: 'createInvite',
  params: z.object({ slug: z.string() }),
  body: z.object({ email: z.email() }),
  response: { 201: z.null() },
}

export type CreateInviteBody = z.infer<typeof createInviteSchema.body>
export type CreateInviteParams = z.infer<typeof createInviteSchema.params>
