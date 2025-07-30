import { writeFile } from 'node:fs'
import { resolve } from 'node:path'
import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUI from '@fastify/swagger-ui'
import fastify from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'

import { env } from '../env'
import { createCompletionRoute } from './routes/create-completion'
import { createGoalRoute } from './routes/create-goal'
import { createExpenseRoute } from './routes/create-expense'
import { createOrganizationRoute } from './routes/create-organization'
import { getExpenseRoute } from './routes/get-expense'
import { listExpensesRoute } from './routes/list-expenses'
import { createNewUserRoute } from './routes/create-new-user'
import { listUsersRoute } from './routes/list-users'
import { listOrganizationsRoute } from './routes/list-organizations'
import { getPendingGoalsRoute } from './routes/get-pending-goals'
import { getWeekSummaryRoute } from './routes/get-week-summary'
import { signInRoute } from './routes/sigin-in'
import { validateTokenRoute } from './routes/validate-token'

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.register(fastifyCors, { origin: '*' })

app.register(fastifyJwt, {
  secret: env.JWT_SECRETT,
})

// Add schema validator and serializer
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'HouseApp API',
      description: 'API for HouseApp',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUI, {
  routePrefix: '/docs',
})

app.register(createGoalRoute)
app.register(createCompletionRoute)
app.register(getPendingGoalsRoute)
app.register(getWeekSummaryRoute)
app.register(createExpenseRoute)
app.register(getExpenseRoute)
app.register(listExpensesRoute)
app.register(createOrganizationRoute)
app.register(createNewUserRoute)
app.register(listUsersRoute)
app.register(listOrganizationsRoute)
app.register(validateTokenRoute)
app.register(signInRoute)

app.listen({ port: 3333, host: '0.0.0.0' }).then(address => {
  console.log(`Server listening at ${address}`)
})

if (env.NODE_ENV === 'development') {
  const specFile = resolve(__dirname, '../../swagger.json')

  app.ready().then(() => {
    const spec = JSON.stringify(app.swagger(), null, 2)

    writeFile(specFile, spec, () => {
      console.log(`Swagger spec generated! ${specFile}`)
    })
  })
}
