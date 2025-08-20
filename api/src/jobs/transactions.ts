import * as cron from 'node-cron'

import { runReports } from '@/domain/reports/transactions'
import { getDistinctOwnerIds } from '@/domain/reports/utils'
import { logger } from '@/http/utils/logger'

/**
 * Executa o relatório para todos os owners distintos
 */
async function runReportsForAllOwners() {
  const ownerIds = await getDistinctOwnerIds()
  if (!ownerIds.length) {
    logger.warn('[reports] nenhum ownerId encontrado, nada a processar')
    return
  }

  for (const ownerId of ownerIds) {
    try {
      await runReports(ownerId)
    } catch (err) {
      logger.error({ err, ownerId }, '❌ Falha ao gerar relatório para owner')
    }
  }
}

const JOB_KEY = 'reports:all-owners'
const TZ = 'America/Sao_Paulo'

// Usa registro global para evitar múltiplos schedules em dev/HMR
const g = globalThis as unknown as { __cronTasks?: Map<string, cron.ScheduledTask> }
g.__cronTasks ??= new Map()

if (!g.__cronTasks.has(JOB_KEY)) {
  const task = cron.schedule(
    // TROQUE para '0 10 5 * *' quando sair do teste
    '0 10 5 * *',
    async () => {
      try {
        await runReportsForAllOwners()
      } catch (err) {
        // Garante que erros não matem o job nas próximas execuções
        logger.error(
          { err },
          '❌ Erro no cron de relatórios — próxima execução seguirá normalmente'
        )
      }
    },
    { timezone: TZ } // deixa explícito
  )

  g.__cronTasks.set(JOB_KEY, task)
  task.start()
  logger.info('📅 Cron agendado')
} else {
  logger.info({ JOB_KEY }, 'Cron já estava agendado — evitando duplicar')
}

// Opcional: exporta função para execução manual (ex.: rota admin)
export async function runAllOwnersNow() {
  await runReportsForAllOwners()
}
