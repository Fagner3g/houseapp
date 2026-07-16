import z from 'zod'

export const createUserWithInviteSchema = {
  tags: ['User'],
  description: 'Create new user with invite',
  operationId: 'createUserWithInvite',
  body: z.object({
    phone: z.string().min(10, 'Informe um telefone válido').max(11, 'Informe um telefone válido'),
    name: z.string('Informe o seu nome'),
    email: z.email('E-mail inválido'),
  }),
  response: {
    201: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  },
}

export type CreateUserWithInviteBody = z.infer<typeof createUserWithInviteSchema.body>
export type CreateUserWithInvite201 = z.infer<
  (typeof createUserWithInviteSchema.response)[201]
>
