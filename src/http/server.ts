import fastify from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import z from 'zod'

import { createGoal } from '../functions/create-goals'

const app = fastify().withTypeProvider<ZodTypeProvider>()

// Add schema validator and serializer
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.post(
  '/goals',
  {
    schema: {
      body: z.object({
        title: z.string(),
        desiredWeekFrequency: z.number(),
      }),
    },
  },
  async request => {
    const { desiredWeekFrequency, title } = request.body
    await createGoal({ desiredWeekFrequency, title })
  }
)

app.listen({ port: 3333, host: '0.0.0.0' }).then(address => {
  console.log(`Server listening at ${address}`)
})
