#!/usr/bin/env node

import { runMigrations, setupDatabase } from './dist/db/setup.js'
import { logger } from './dist/http/utils/logger.js'

async function start() {
  try {
    logger.info('🚀 Iniciando API HouseApp...')

    // Setup do banco de dados
    logger.info('📊 Configurando banco de dados...')
    await setupDatabase()

    // Executar migrações
    logger.info('🔄 Executando migrações...')
    await runMigrations()

    // Iniciar o servidor
    logger.info('🌐 Iniciando servidor...')
    const { server } = await import('./dist/http/server.js')
    await server()
  } catch (error) {
    logger.error('❌ Erro durante inicialização:', error)
    process.exit(1)
  }
}

start()
