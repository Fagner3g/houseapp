import { env } from '@/config/env'
import { db, ping } from '@/db'
import { registerJobs } from '@/jobs'
import { logger } from './utils/logger'
import { buildServer } from './utils/setup'

async function server() {
  try {
    await ping(db)
    logger.info('database connected')

    // Register crons
    registerJobs()
  } catch (e) {
    logger.error(e, 'ping failed on server: %s', env.DATABASE_URL)
    process.exit(1)
  }

  const server = await buildServer()

  try {
    await server.listen({ port: env.PORT, host: env.HOST })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

server()
