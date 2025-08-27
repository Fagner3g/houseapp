import fs from 'node:fs'
import path from 'node:path'
import { sql } from 'drizzle-orm'
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

// Função para ler e mostrar descrições das migrações pendentes
export async function showPendingMigrations(): Promise<void> {
  try {
    const journalPath = path.join(process.cwd(), '.migrations', 'meta', '_journal.json')

    if (!fs.existsSync(journalPath)) {
      logger.migration('Nenhum arquivo de journal encontrado')
      return
    }

    const journalContent = fs.readFileSync(journalPath, 'utf-8')
    const journal = JSON.parse(journalContent)

    // Consultar quantas migrações já foram aplicadas (ordem é sequencial)
    const { db } = await import('./index')
    let appliedCount = 0
    try {
      const rows: any[] = await db.execute(sql`SELECT count(*)::int AS c FROM drizzle.__drizzle_migrations`)
      const first = rows?.[0]
      appliedCount = typeof first?.c === 'number' ? first.c : parseInt(first?.c ?? '0', 10)
    } catch {
      // Tabela não existe => nenhuma aplicada
      appliedCount = 0
    }

    logger.migration('=== Migrações Pendentes ===')

    const pending = journal.entries.slice(appliedCount)
    if (pending.length === 0) {
      logger.migration('✅ Nenhuma migração pendente encontrada!')
      logger.migration('=== Fim das Migrações ===')
      return
    }

    for (const entry of pending) {
      const migrationFile = path.join(process.cwd(), '.migrations', `${entry.tag}.sql`)
      if (fs.existsSync(migrationFile)) {
        const sqlContent = fs.readFileSync(migrationFile, 'utf-8')
        const description = sqlContent.split('\n')[0] || 'Sem descrição'
        logger.migration(`📋 ${entry.tag} (PENDENTE)`)
        logger.migration(`   Descrição: ${description}`)
        logger.migration(`   Data: ${new Date(entry.when).toLocaleString('pt-BR')}`)
        logger.migration('')
      } else {
        logger.migration(`📋 ${entry.tag} (PENDENTE) - arquivo não encontrado`)
      }
    }

    logger.migration('=== Fim das Migrações ===')
  } catch (error) {
    logger.error('Erro ao ler descrições das migrações:', error)
  }
}

// Função para verificar se há migrações pendentes
async function hasPendingMigrations(): Promise<boolean> {
  try {
    const journalPath = path.join(process.cwd(), '.migrations', 'meta', '_journal.json')
    if (!fs.existsSync(journalPath)) {
      return false
    }

    const journalContent = fs.readFileSync(journalPath, 'utf-8')
    const journal = JSON.parse(journalContent)

    const totalMigrations = Array.isArray(journal.entries) ? journal.entries.length : 0
    if (totalMigrations === 0) return false

    const { db } = await import('./index')
    let appliedCount = 0
    try {
      const rows: any[] = await db.execute(sql`SELECT count(*)::int AS c FROM drizzle.__drizzle_migrations`)
      const first = rows?.[0]
      appliedCount = typeof first?.c === 'number' ? first.c : parseInt(first?.c ?? '0', 10)
    } catch {
      appliedCount = 0
    }

    return appliedCount < totalMigrations
  } catch (error) {
    logger.error('Erro ao verificar migrações pendentes:', error)
    return false
  }
}

// Função para executar migrações com logs
export async function runMigrations(): Promise<void> {
  try {
    logger.migration('Verificando migrações pendentes...')

    // Verificar se há migrações pendentes
    const hasPending = await hasPendingMigrations()

    if (!hasPending) {
      logger.migration('✅ Nenhuma migração pendente encontrada!')
      return
    }

    // Mostrar descrições das migrações pendentes
    await showPendingMigrations()

    logger.migration('Executando migrações pendentes...')

    // Executar migrações via drizzle-kit (usando script do package.json)
    const { execSync } = await import('node:child_process')

    // Detectar caminho do drizzle.config.ts
    const candidateConfigs = [
      path.join(process.cwd(), 'drizzle.config.ts'),
      path.join(process.cwd(), 'api', 'drizzle.config.ts'),
    ]
    const foundConfig = candidateConfigs.find((p) => fs.existsSync(p))

    if (!foundConfig) {
      throw new Error('drizzle.config.ts não encontrado. Verifique a localização do arquivo.')
    }

    const configDir = path.dirname(foundConfig)
    const configFlag = `--config ${foundConfig}`

    const { baseUrl } = getDatabaseString()

    try {
      logger.migration(`Executando migrações com drizzle-kit (config: ${foundConfig})...`)
      execSync(`yarn db:migrate ${configFlag}`, {
        stdio: 'inherit',
        cwd: configDir,
        env: { ...process.env, DATABASE_URL: baseUrl },
      })
      logger.migration('✅ Migrações executadas com sucesso!')
    } catch (migrationError) {
      logger.error('Erro durante execução das migrações:', migrationError)
      throw migrationError
    }

    // Verificar novamente se as migrações foram aplicadas
    logger.migration('Verificando se as migrações foram aplicadas...')
    const stillPending = await hasPendingMigrations()

    if (stillPending) {
      logger.error('❌ As migrações não foram aplicadas corretamente!')
      throw new Error('Falha ao aplicar migrações')
    } else {
      logger.migration('✅ Todas as migrações foram aplicadas com sucesso!')
    }
  } catch (error) {
    logger.error('Erro ao executar migrações')
    throw error
  }
}
