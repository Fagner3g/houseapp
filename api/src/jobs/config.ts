import type { JobConfig } from './types'

export const JOB_CONFIGS: Record<string, JobConfig> = {
  // Relatórios removidos (reports:all-owners e reports:owner-digest)

  MATERIALIZE_OCCURRENCES: {
    key: 'transactions:materialize',
    schedule: '0 3 * * *', // Todo dia às 03:00
    timezone: 'America/Sao_Paulo',
    description: 'Materialização de ocorrências de transações recorrentes',
  },

  TRANSACTION_ALERTS: {
    key: 'transactions:alerts',
    schedule: '0 9 * * *', // Todo dia às 09:00
    timezone: 'America/Sao_Paulo',
    description: 'Alertas para transações vencidas ou prestes a vencer',
  },
}

export const TIMEZONE = 'America/Sao_Paulo'
export const DEFAULT_SCHEDULE = {
  DAILY_3AM: '0 3 * * *',
  MONTHLY_5TH_10AM: '0 10 5 * *',
}
