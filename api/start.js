#!/usr/bin/env node

async function start() {
  try {
    // Detectar se estamos em desenvolvimento ou produção
    const isDev = process.env.NODE_ENV === 'development'
    const isProd = process.env.NODE_ENV === 'production'
    
    console.log(`🚀 Iniciando API HouseApp em modo ${process.env.NODE_ENV || 'development'}...`)

    if (isDev) {
      // Modo desenvolvimento - usar TypeScript diretamente
      console.log('📝 Modo desenvolvimento - usando TypeScript...')
      
      // Importar setup e logger do TypeScript
      const { runMigrations, setupDatabase } = await import('./src/db/setup.js')
      const { logger } = await import('./src/http/utils/logger.js')
      
      // Setup do banco de dados
      logger.info('📊 Configurando banco de dados...')
      await setupDatabase()

      // Executar migrações
      logger.info('🔄 Executando migrações...')
      await runMigrations()

      // Iniciar o servidor
      logger.info('🌐 Iniciando servidor...')
      const { server } = await import('./src/http/server.js')
      await server()
      
    } else {
      // Modo produção - usar JavaScript compilado
      console.log('🏭 Modo produção - usando JavaScript compilado...')
      
      // Importar setup e logger do JavaScript compilado
      const { runMigrations, setupDatabase } = await import('./dist/db/setup.js')
      const { logger } = await import('./dist/http/utils/logger.js')
      
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
    }
    
  } catch (error) {
    console.error('❌ Erro durante inicialização:', error)
    process.exit(1)
  }
}

start()
