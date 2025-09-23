import z from 'zod'

export const signInSchema = {
  tags: ['Auth'],
  description: 'Sigin In (email or whatsapp)',
  operationId: 'signIn',
  body: z
    .object({
      email: z.string().optional(),
      phone: z
        .string()
        .transform(v => v.replace(/\D/g, ''))
        .optional(),
    })
    .refine(v => !!(v.email || v.phone), { message: 'email or phone is required' }),
  response: {
    200: z.object({ ok: z.boolean() }),
    400: z.null(),
  },
}

export type SignInSchemaBody = z.infer<typeof signInSchema.body>
