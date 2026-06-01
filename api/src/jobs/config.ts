import type { JobConfig } from './types'

export const JOB_CONFIGS: Record<string, JobConfig> = {
  // Relatórios removidos (reports:all-owners e reports:owner-digest)

  MATERIALIZE_OCCURRENCES: {
    key: 'transactions:materialize',
    schedule: '0 3 * * *', // Todo dia às 03:00
    timezone: 'America/Sao_Paulo',
    description: 'Manutenção automática de transações recorrentes',
  },

  TRANSACTION_ALERTS: {
    key: 'transactions:alerts',
    schedule: '0 9 * * *', // Todo dia às 09:00
    timezone: 'America/Sao_Paulo',
    description: 'Alertas diários de vencimentos próximos (0 a 4 dias)',
  },

  OVERDUE_ALERTS: {
    key: 'transactions:overdue-alerts',
    schedule: '0 10 28-31 * *', // Último dia do mês (roda dias 28-31 e filtra no código)
    timezone: 'America/Sao_Paulo',
    description: 'Relatório de pendências vencidas (último dia do mês)',
  },

  MONTHLY_SUMMARY: {
    key: 'transactions:monthly-summary',
    schedule: '0 10 1 * *', // Todo dia 1º às 10:00
    timezone: 'America/Sao_Paulo',
    description: 'Resumo do mês anterior para todos os usuários (roda dia 1º)',
  },
}

export const TIMEZONE = 'America/Sao_Paulo'
export const DEFAULT_SCHEDULE = {
  DAILY_3AM: '0 3 * * *',
  MONTHLY_5TH_10AM: '0 10 5 * *',
}
