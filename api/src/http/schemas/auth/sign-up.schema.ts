import z from 'zod'

export const sigInUpSchema = {
  tags: ['Auth'],
  description: 'Create new user',
  operationId: 'signUp',
  body: z.object({
    ddd: z
      .string()
      .min(2, 'Informe um DDD válido')
      .max(2, 'Informe um DDD válido')
      .regex(/^\d+$/, 'Informe um DDD válido'),
    phone: z.string().min(8, 'Informe um telefone válido').max(10, 'Informe um telefone válido'),
    name: z.string('Informe o seu nome'),
    email: z.email('E-mail inválido'),
    inviteToken: z.string().optional(),
  }),
  response: {
    201: z.null(),
  },
}

export type SignInUpBody = z.infer<typeof sigInUpSchema.body>
