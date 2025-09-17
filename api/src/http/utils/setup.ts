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

import { env } from '@/config/env'
import { version } from '../../../../package.json'
import { createRoutes } from '../routes'
import { errorHandler } from './error/handlers'
import { centsToDecimalString } from './format'
import { logger } from './logger'
import { reqReplyTime } from './metrics'

export async function buildServer() {
  const app = fastify(
    env.LOG_FASTIFY
      ? {
          logger: {
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
          },
        }
      : {}
  ).withTypeProvider<ZodTypeProvider>()

  // add reply serializer (BigInt -> string). For monetary fields (amount), serialize as decimal with 2 casas.
  app.setReplySerializer(payload => {
    return JSON.stringify(payload, (k, v) => {
      if (typeof v === 'bigint') {
        // Converte especificamente o campo `amount` (centavos) para string decimal fixa (ex.: "12.34")
        if (k === 'amount') return centsToDecimalString(v)
        // Demais BigInts seguem como string
        return v.toString()
      }
      return v
    })
  })

  // Add schema validator and serializer
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.addHook('onResponse', reqReplyTime)

  app.register(fastifyCors, {
    origin: (origin, cb) => {
      // Permite chamadas de ferramentas (origin null), da WEB_URL e do localhost em dev
      const allowed = [env.WEB_URL, 'http://localhost:5173', 'http://localhost:3333'].filter(
        Boolean
      )
      if (!origin || allowed.includes(origin)) return cb(null, true)
      return cb(new Error('Not allowed by CORS'), false)
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['Content-Type'],
    credentials: false, // mude para true se usar cookies/same-site
  })

  app.register(fastifyJwt, { secret: env.JWT_SECRET })

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'HouseApp API',
        description: 'API for HouseApp',
        version,
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    transform: jsonSchemaTransform,
  })

  app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  })

  // Register error handler
  app.setErrorHandler(errorHandler)

  app.after(() => {
    createRoutes(app)
  })

  if (env.NODE_ENV === 'development') {
    const specFile = resolve(__dirname, '../../../swagger.json')

    app.ready().then(() => {
      const spec = JSON.stringify(app.swagger(), null, 2)

      writeFile(specFile, spec, () => {
        logger.info('Swagger spec generated!')
      })
    })
  }

  return app
}
