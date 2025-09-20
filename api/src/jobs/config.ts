import type { JobConfig } from './types'

export const JOB_CONFIGS: Record<string, JobConfig> = {
  REPORTS: {
    key: 'reports:all-owners',
    schedule: '0 10 5 * *', // Dia 5 às 10:00
    timezone: 'America/Sao_Paulo',
    description: 'Relatórios de transações para todos os proprietários',
  },

  OWNER_DIGEST: {
    key: 'reports:owner-digest',
    schedule: '0 10 5 * *', // Dia 5 às 10:00
    timezone: 'America/Sao_Paulo',
    description: 'Digest consolidado para proprietários',
  },

  MATERIALIZE_OCCURRENCES: {
    key: 'transactions:materialize',
    schedule: '0 3 * * *', // Todo dia às 03:00
    timezone: 'America/Sao_Paulo',
    description: 'Materialização de ocorrências de transações recorrentes',
  },

  TRANSACTION_ALERTS: {
    key: 'transactions:alerts',
    schedule: '0 9,15,21 * * *', // Todo dia às 09:00, 15:00 e 21:00
    timezone: 'America/Sao_Paulo',
    description: 'Alertas para transações vencidas ou prestes a vencer',
  },
}

export const TIMEZONE = 'America/Sao_Paulo'
export const DEFAULT_SCHEDULE = {
  DAILY_3AM: '0 3 * * *',
  MONTHLY_5TH_10AM: '0 10 5 * *',
}
