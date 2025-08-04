import z from 'zod'

export const signInSchema = {
  tags: ['Auth'],
  description: 'Sigin In',
  operationId: 'signIn',
  body: z.object({
    email: z.email('E-mail inválido'),
  }),
  response: {
    200: z.null(),
    400: z.null(),
  },
}

export type SignInSchemaBody = z.infer<typeof signInSchema.body>
