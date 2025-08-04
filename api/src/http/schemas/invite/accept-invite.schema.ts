import z from 'zod'

export const acceptInviteSchema = {
  tags: ['Invite'],
  description: 'Accept organization invite',
  operationId: 'acceptInvite',
  params: z.object({ slug: z.string(), token: z.string() }),
  response: { 200: z.null() },
}

export type AcceptInviteSchemaParams = z.infer<typeof acceptInviteSchema.params>
