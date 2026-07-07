import z from 'zod'

export const signInSchema = {
  tags: ['Auth'],
  description: 'Sign in via email or WhatsApp magic link',
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

export const signUpSchema = {
  tags: ['Auth'],
  description: 'Create new user',
  operationId: 'signUp',
  body: z.object({
    phone: z.string().min(10, 'Informe um telefone válido').max(11, 'Informe um telefone válido'),
    name: z.string('Informe o seu nome'),
    email: z.email('E-mail inválido'),
  }),
  response: {
    201: z.null(),
  },
}

export const validateTokenSchema = {
  tags: ['Auth'],
  description: 'Validate magic link token',
  operationId: 'validateToken',
  body: z.object({
    token: z.string(),
  }),
  response: {
    200: z.object({
      valid: z.boolean(),
      slug: z.string().nullable().optional(),
    }),
  },
}

export const logoutSchema = {
  tags: ['Auth'],
  description: 'Sign out and revoke token',
  operationId: 'signOut',
  headers: z.object({
    authorization: z.string(),
  }),
  response: {
    200: z.null(),
  },
}

export type SignInBody = z.infer<typeof signInSchema.body>
export type SignUpBody = z.infer<typeof signUpSchema.body>
export type ValidateTokenBody = z.infer<typeof validateTokenSchema.body>
