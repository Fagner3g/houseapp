import postgres from 'postgres'

import { env } from '../config/env'
import { logger } from '../lib/logger'

// Função para obter informações do banco das variáveis de ambiente
export function getDatabaseString() {
  const dbName = env.DB_NAME
  const host = env.DB_HOST
  const port = env.DB_PORT
  const username = env.DB_USER
  const password = env.DB_PASSWORD

  // URL sem o nome do banco para conectar ao postgres
  const baseUrl = `postgresql://${username}:${password}@${host}:${port}/${dbName}`

  return { dbName, baseUrl, host, port, username, password }
}

// Função para testar conexão com PostgreSQL
async function testPostgresConnection(baseUrl: string): Promise<boolean> {
  const client = postgres(baseUrl, { max: 1, idle_timeout: 10 })

  try {
    logger.database('Testando conexão com PostgreSQL...')
    logger.debug(`URL: ${baseUrl}`)
    await client`SELECT 1`
    logger.database('Conexão com PostgreSQL estabelecida com sucesso!')
    return true
  } catch (error) {
    logger.error(`Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    return false
  } finally {
    await client.end()
  }
}

// Função para verificar se o banco existe
async function databaseExists(dbName: string, baseUrl: string): Promise<boolean> {
  const client = postgres(baseUrl, { max: 1 })

  try {
    const result = await client`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}
    `
    return result.length > 0
  } catch {
    return false
  } finally {
    await client.end()
  }
}

// Função para criar o banco de dados
async function createDatabase(dbName: string, baseUrl: string): Promise<void> {
  const client = postgres(baseUrl, { max: 1 })

  try {
    logger.database(`Criando banco de dados: ${dbName}`)
    await client`CREATE DATABASE ${dbName}`
    logger.database(`Banco de dados ${dbName} criado com sucesso!`)
  } catch (error) {
    logger.error(`Erro ao criar banco de dados ${dbName}`)
    throw error
  } finally {
    await client.end()
  }
}

// Função principal para setup do banco
export async function setupDatabase(): Promise<void> {
  try {
    const { dbName, baseUrl } = getDatabaseString()

    // Primeiro, testar conexão com PostgreSQL
    const isConnected = await testPostgresConnection(baseUrl)
    if (!isConnected) {
      throw new Error('Não foi possível conectar ao PostgreSQL')
    }

    logger.database(`Verificando banco de dados: ${dbName}`)

    const exists = await databaseExists(dbName, baseUrl)

    if (exists) {
      logger.database(`Banco de dados ${dbName} já existe, prosseguindo...`)
    } else {
      logger.database(`Banco de dados ${dbName} não existe, criando...`)
      await createDatabase(dbName, baseUrl)
    }

    logger.database('Setup do banco de dados concluído com sucesso!')
  } catch (error) {
    logger.error('Erro no setup do banco de dados')
    throw error
  }
}

// Função para executar migrações com logs
export async function runMigrations(): Promise<void> {
  try {
    logger.migration('Iniciando execução das migrações...')

    // Importar e executar as migrações do Drizzle
    const { migrate } = await import('drizzle-orm/postgres-js/migrator')
    const { db } = await import('./index')

    await migrate(db, {
      migrationsFolder: '.migrations',
    })

    logger.migration('Migrações executadas com sucesso!')
  } catch (error) {
    logger.error('Erro ao executar migrações')
    throw error
  }
}
