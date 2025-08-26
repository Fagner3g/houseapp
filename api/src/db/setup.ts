import { sql } from 'drizzle-orm'
import postgres from 'postgres'

import { env } from '@/config/env'
import { logger } from '@/http/utils/logger'

// Função para extrair informações da DATABASE_URL
function parseDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl)
  const dbName = url.pathname.slice(1) // Remove a barra inicial
  const host = url.hostname
  const port = url.port || '5432'
  const username = url.username
  const password = url.password

  // URL sem o nome do banco para conectar ao postgres
  const baseUrl = `postgresql://${username}:${password}@${host}:${port}/postgres`

  return { dbName, baseUrl, host, port, username, password }
}

// Função para obter informações do banco das variáveis de ambiente
function getDatabaseInfo() {
  const { env } = require('@/config/env')

  const dbName = env.DB_NAME
  const host = env.DB_HOST
  const port = env.DB_PORT
  const username = env.DB_USER
  const password = env.DB_PASSWORD

  // URL sem o nome do banco para conectar ao postgres
  const baseUrl = `postgresql://${username}:${password}@${host}:${port}/postgres`

  return { dbName, baseUrl, host, port, username, password }
}

// Função para verificar se o banco existe
async function databaseExists(dbName: string, baseUrl: string): Promise<boolean> {
  const client = postgres(baseUrl, { max: 1 })

  try {
    const result = await client`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}
    `
    return result.length > 0
  } catch (error) {
    logger.error('Erro ao verificar se banco existe:', error)
    return false
  } finally {
    await client.end()
  }
}

// Função para criar o banco de dados
async function createDatabase(dbName: string, baseUrl: string): Promise<void> {
  const client = postgres(baseUrl, { max: 1 })

  try {
    logger.info(`Criando banco de dados: ${dbName}`)
    await client`CREATE DATABASE ${sql.raw(dbName)}`
    logger.info(`Banco de dados ${dbName} criado com sucesso!`)
  } catch (error) {
    logger.error(`Erro ao criar banco de dados ${dbName}:`, error)
    throw error
  } finally {
    await client.end()
  }
}

// Função principal para setup do banco
export async function setupDatabase(): Promise<void> {
  try {
    const { dbName, baseUrl } = getDatabaseInfo()

    logger.info(`Verificando banco de dados: ${dbName}`)

    const exists = await databaseExists(dbName, baseUrl)

    if (exists) {
      logger.info(`Banco de dados ${dbName} já existe, prosseguindo...`)
    } else {
      logger.info(`Banco de dados ${dbName} não existe, criando...`)
      await createDatabase(dbName, baseUrl)
    }

    logger.info('Setup do banco de dados concluído com sucesso!')
  } catch (error) {
    logger.error('Erro no setup do banco de dados:', error)
    throw error
  }
}

// Função para executar migrações com logs
export async function runMigrations(): Promise<void> {
  try {
    logger.info('Iniciando execução das migrações...')

    // Importar e executar as migrações do Drizzle
    const { migrate } = await import('drizzle-orm/postgres-js/migrator')
    const { db } = await import('./index')

    // Logger customizado para migrações
    const migrationLogger = {
      log: (message: string) => {
        logger.info(`📋 Migração: ${message}`)
      },
      error: (message: string) => {
        logger.error(`❌ Erro na migração: ${message}`)
      },
      warn: (message: string) => {
        logger.warn(`⚠️ Aviso na migração: ${message}`)
      },
    }

    await migrate(db, {
      migrationsFolder: '.migrations',
      logger: migrationLogger,
    })

    logger.info('✅ Migrações executadas com sucesso!')
  } catch (error) {
    logger.error('❌ Erro ao executar migrações:', error)
    throw error
  }
}
