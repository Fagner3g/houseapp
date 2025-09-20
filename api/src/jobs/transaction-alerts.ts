import { and, eq, gte, lte, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

/**
 * Envia alertas para transações vencidas ou prestes a vencer
 */
async function sendTransactionAlerts(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    console.log('🚀 Iniciando job de alertas de transações...')

    const today = new Date()
    const fourDaysFromNow = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)

    console.log(
      `🔍 Buscando transações que vencem entre ${today.toISOString()} e ${fourDaysFromNow.toISOString()}`
    )

    // Buscar transações que vencem em até 4 dias
    const upcomingTransactions = await db
      .select({
        id: transactionOccurrences.id,
        title: transactionSeries.title,
        amount: transactionOccurrences.amount,
        dueDate: transactionOccurrences.dueDate,
        status: transactionOccurrences.status,
        ownerId: transactionSeries.ownerId,
        ownerName: sql<string>`owner.name`,
        ownerPhone: sql<string>`owner.phone`,
        payToId: transactionSeries.payToId,
        payToName: sql<string>`pay_to.name`,
        payToPhone: sql<string>`pay_to.phone`,
      })
      .from(transactionOccurrences)
      .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
      .innerJoin(sql`users as owner`, eq(transactionSeries.ownerId, sql`owner.id`))
      .leftJoin(sql`users as pay_to`, eq(transactionSeries.payToId, sql`pay_to.id`))
      .where(
        and(
          eq(transactionOccurrences.status, 'pending'),
          gte(transactionOccurrences.dueDate, today),
          lte(transactionOccurrences.dueDate, fourDaysFromNow)
        )
      )

    console.log(`📊 Encontradas ${upcomingTransactions.length} transações próximas do vencimento`)

    // Processar cada transação
    for (const transaction of upcomingTransactions) {
      try {
        const daysUntilDue = Math.ceil(
          (transaction.dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        )

        // Determinar o tipo de alerta baseado nos dias restantes
        let alertType: 'warning' | 'urgent' | 'overdue'
        let message: string
        const amount = Number(transaction.amount) / 100

        if (daysUntilDue === 0) {
          // Vence hoje - alerta mais expressivo
          alertType = 'urgent'
          message = `🚨🚨 ALERTA CRÍTICO DE VENCIMENTO 🚨🚨

⚠️ SUA TRANSAÇÃO VENCE HOJE! ⚠️

📋 *${transaction.title}*
💰 Valor: R$ ${amount.toFixed(2)}
📅 Vencimento: HOJE
⏰ Ação necessária: URGENTE

🔔 Este é um alerta de vencimento no dia. 
Por favor, tome as devidas providências imediatamente.

---
🏠 HouseApp - Sistema de Gestão Financeira`
        } else if (daysUntilDue === 1) {
          // Vence amanhã - alerta urgente
          alertType = 'urgent'
          message = `🚨 ALERTA URGENTE - VENCIMENTO AMANHÃ 🚨

⚠️ Sua transação vence AMANHÃ!

📋 *${transaction.title}*
💰 Valor: R$ ${amount.toFixed(2)}
📅 Vencimento: AMANHÃ
⏰ Ação necessária: URGENTE

🔔 Prepare-se para o vencimento. 
Não esqueça de realizar o pagamento.

---
🏠 HouseApp - Sistema de Gestão Financeira`
        } else if (daysUntilDue === 2) {
          // Vence em 2 dias - alerta de aviso
          alertType = 'warning'
          message = `⚠️ LEMBRETE IMPORTANTE ⚠️

📋 *${transaction.title}*
💰 Valor: R$ ${amount.toFixed(2)}
📅 Vencimento: em 2 dias
⏰ Ação necessária: Prepare-se

🔔 Sua transação vence em 2 dias. 
Lembre-se de realizar o pagamento.

---
🏠 HouseApp - Sistema de Gestão Financeira`
        } else {
          // Vence em 3-4 dias - lembrete
          alertType = 'warning'
          message = `📅 Lembrete de Vencimento

📋 *${transaction.title}*
💰 Valor: R$ ${amount.toFixed(2)}
📅 Vencimento: em ${daysUntilDue} dias

🔔 Sua transação vence em ${daysUntilDue} dias. 
Mantenha-se organizado com seus pagamentos.

---
🏠 HouseApp - Sistema de Gestão Financeira`
        }

        // Lógica inteligente para evitar spam baseada no horário e tipo de alerta
        const shouldSendAlert = shouldSendAlertBasedOnTime(daysUntilDue, alertType)

        if (shouldSendAlert) {
          // Enviar alerta para o proprietário
          if (transaction.ownerPhone) {
            const ownerMessage = personalizeMessage(message, transaction.ownerName)
            await sendWhatsAppAlert(transaction.ownerPhone, ownerMessage, alertType)
          }

          // Enviar alerta para o responsável (se diferente do proprietário)
          if (
            transaction.payToId &&
            transaction.payToId !== transaction.ownerId &&
            transaction.payToPhone
          ) {
            const payToMessage = personalizeMessage(message, transaction.payToName)
            await sendWhatsAppAlert(transaction.payToPhone, payToMessage, alertType)
          }
        }

        processed++
      } catch (error) {
        console.error(`Erro ao processar transação ${transaction.id}:`, error)
        errors++
      }
    }

    return {
      success: errors === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    console.error('Erro no job de alertas de transações:', error)
    return {
      success: false,
      processed,
      errors: errors + 1,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Personaliza a mensagem com o nome da pessoa
 */
function personalizeMessage(message: string, userName: string): string {
  // Adiciona uma saudação personalizada no início da mensagem
  const greeting = `Olá, ${userName}! 👋\n\n`
  return greeting + message
}

/**
 * Lógica inteligente para evitar spam baseada no horário e tipo de alerta
 * O job roda às 09:00, 15:00 e 21:00, então:
 * - Alertas urgentes (hoje/amanhã): sempre envia
 * - Alertas de aviso (2 dias): envia apenas às 09:00
 * - Lembretes (3-4 dias): envia apenas às 09:00 em dias pares
 */
function shouldSendAlertBasedOnTime(
  daysUntilDue: number,
  alertType: 'warning' | 'urgent' | 'overdue'
): boolean {
  const now = new Date()
  const hour = now.getHours()
  const dayOfMonth = now.getDate()

  if (alertType === 'urgent') {
    // Alertas urgentes sempre enviam (hoje/amanhã)
    return true
  } else if (daysUntilDue === 2) {
    // Alertas de 2 dias: apenas às 09:00
    return hour === 9
  } else {
    // Lembretes de 3-4 dias: apenas às 09:00 em dias pares
    return hour === 9 && dayOfMonth % 2 === 0
  }
}

/**
 * Envia alerta via WhatsApp usando o serviço existente
 */
async function sendWhatsAppAlert(
  phone: string,
  message: string,
  type: 'warning' | 'urgent' | 'overdue'
): Promise<void> {
  try {
    console.log(`📱 Enviando WhatsApp Alert (${type}) para: ${phone}`)

    const result = await sendWhatsAppMessage({ phone, message })

    if (result.status === 'sent') {
      console.log(`✅ WhatsApp enviado com sucesso para: ${phone}`)
    } else {
      console.error(`❌ Erro ao enviar WhatsApp para ${phone}: ${result.error}`)
      throw new Error(result.error || 'Erro desconhecido ao enviar WhatsApp')
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar WhatsApp para ${phone}:`, error)
    throw error
  }
}

// Registrar o job
jobManager.registerJob(JOB_CONFIGS.TRANSACTION_ALERTS, sendTransactionAlerts)

// Export para execução manual
export async function runTransactionAlertsNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.TRANSACTION_ALERTS.key)
}
