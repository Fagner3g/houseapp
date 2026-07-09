import { env } from '@/config/env'

import type { JobConfig } from './types'

export const JOB_CONFIGS: Record<string, JobConfig> = {
  // Relatórios removidos (reports:all-owners e reports:owner-digest)

  MATERIALIZE_OCCURRENCES: {
    key: 'transactions:materialize',
    schedule: '0 3 * * *', // Todo dia às 03:00
    timezone: 'America/Sao_Paulo',
    description: 'Manutenção automática de transações recorrentes',
  },

  MONTHLY_SUMMARY: {
    key: 'transactions:monthly-summary',
    schedule: '0 10 1 * *', // Todo dia 1º às 10:00
    timezone: 'America/Sao_Paulo',
    description: 'Resumo do mês anterior para todos os usuários (roda dia 1º)',
  },

  EVALUATE_ALERTS: {
    key: 'alerts:evaluate',
    schedule: '* * * * *',
    timezone: 'America/Sao_Paulo',
    description: 'Avalia lembretes personalizados e dispara alertas',
    enabled: env.jobsAlertsEnabled,
  },

  SEND_WHATSAPP_ALERTS: {
    key: 'alerts:send-whatsapp',
    schedule: '*/2 * * * *',
    timezone: 'America/Sao_Paulo',
    description: 'Envia alertas WhatsApp pendentes (membros e contatos externos)',
    enabled: env.jobsAlertsEnabled,
  },
}

export const TIMEZONE = 'America/Sao_Paulo'
export const DEFAULT_SCHEDULE = {
  DAILY_3AM: '0 3 * * *',
  MONTHLY_5TH_10AM: '0 10 5 * *',
}
