import { and, eq, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { tags } from '@/db/schemas/tags'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import { transactionTags } from '@/db/schemas/transactionTags'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'
import { addMessageFooter } from './utils/message-footer'

/**
 * Envia alertas para transações vencidas ou prestes a vencer
 */
async function sendTransactionAlerts(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    console.log('🚀 Iniciando job de alertas de transações...')

    // Normalizar datas para evitar problemas de fuso horário
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Início do dia
    const fourDaysFromNow = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
    fourDaysFromNow.setHours(23, 59, 59, 999) // Final do dia

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

    if (upcomingTransactions.length === 0) {
      console.log(`ℹ️ Nenhuma transação encontrada para alertas`)
      return {
        success: true,
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      }
    }

    // Processar cada transação
    for (const transaction of upcomingTransactions) {
      try {
        // Normalizar a data de vencimento para comparação
        const dueDate = new Date(transaction.dueDate)
        dueDate.setHours(0, 0, 0, 0)

        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        )

        console.log(
          `📅 Transação: ${transaction.title} | Vencimento: ${transaction.dueDate.toISOString()} | Hoje: ${today.toISOString()} | Dias restantes: ${daysUntilDue}`
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
Por favor, tome as devidas providências imediatamente.`
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
Não esqueça de realizar o pagamento.`
        } else if (daysUntilDue === 2) {
          // Vence em 2 dias - alerta de aviso
          alertType = 'warning'
          message = `⚠️ LEMBRETE IMPORTANTE ⚠️

📋 *${transaction.title}*
💰 Valor: R$ ${amount.toFixed(2)}
📅 Vencimento: em 2 dias
⏰ Ação necessária: Prepare-se

🔔 Sua transação vence em 2 dias. 
Lembre-se de realizar o pagamento.`
        } else {
          // Vence em 3-4 dias - lembrete
          alertType = 'warning'
          message = `📅 Lembrete de Vencimento

📋 *${transaction.title}*
💰 Valor: R$ ${amount.toFixed(2)}
📅 Vencimento: em ${daysUntilDue} dias

🔔 Sua transação vence em ${daysUntilDue} dias. 
Mantenha-se organizado com seus pagamentos.`
        }

        // Enviar alerta para o proprietário
        if (transaction.ownerPhone) {
          console.log(`📱 Enviando alerta para proprietário: ${transaction.ownerPhone}`)
          const ownerMessage = personalizeMessage(message, transaction.ownerName)
          await sendWhatsAppAlert(transaction.ownerPhone, ownerMessage, alertType)
        } else {
          console.log(`⚠️ Proprietário sem telefone: ${transaction.ownerName}`)
        }

        // Enviar alerta para o responsável (se diferente do proprietário)
        if (
          transaction.payToId &&
          transaction.payToId !== transaction.ownerId &&
          transaction.payToPhone
        ) {
          console.log(`📱 Enviando alerta para responsável: ${transaction.payToPhone}`)
          const payToMessage = personalizeMessage(message, transaction.payToName)
          await sendWhatsAppAlert(transaction.payToPhone, payToMessage, alertType)
        } else {
          console.log(`⚠️ Responsável sem telefone ou mesmo proprietário: ${transaction.payToName}`)
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
 * Personaliza a mensagem com o nome da pessoa e adiciona o footer
 */
function personalizeMessage(message: string, userName: string): string {
  // Adiciona uma saudação personalizada no início da mensagem
  const greeting = `Olá, ${userName}! 👋\n\n`
  const personalizedMessage = greeting + message

  // Adiciona o footer padrão
  return addMessageFooter(personalizedMessage)
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
    console.log(`📝 Mensagem: ${message.substring(0, 100)}...`)

    const result = await sendWhatsAppMessage({ phone, message })

    console.log(`📊 Resultado do envio:`, result)

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

// Export para preview (sem envio de WhatsApp)
export async function previewTransactionAlerts(
  orgIds: string | string[],
  userId?: string
): Promise<{
  transactions: Array<{
    seriesId: string
    id: string
    title: string
    amount: number
    dueDate: Date
    daysUntilDue: number
    alertType: 'warning' | 'urgent' | 'overdue'
    ownerId: string
    ownerName: string
    ownerPhone: string
    payToName: string | null
    payToEmail: string | null
    payToPhone: string | null
    installmentsTotal: number | null
    installmentsPaid: number
  }>
  summary: {
    total: number
    today: number
    tomorrow: number
    twoDays: number
    threeToFourDays: number
  }
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fourDaysFromNow = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
  fourDaysFromNow.setHours(23, 59, 59, 999)

  const upcomingTransactions = await db
    .select({
      id: transactionOccurrences.id,
      seriesId: transactionOccurrences.seriesId,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      dueDate: transactionOccurrences.dueDate,
      status: transactionOccurrences.status,
      ownerId: transactionSeries.ownerId,
      ownerName: sql<string>`owner.name`,
      ownerPhone: sql<string>`owner.phone`,
      payToId: transactionSeries.payToId,
      payToName: sql<string>`pay_to.name`,
      payToEmail: sql<string>`pay_to.email`,
      payToPhone: sql<string>`pay_to.phone`,
      description: transactionOccurrences.description,
      installmentsTotal: transactionSeries.installmentsTotal,
      tags: sql<{ name: string; color: string }[]>`
        coalesce(
          jsonb_agg(distinct jsonb_build_object('name', ${tags.name}, 'color', ${tags.color}))
            filter (where ${tags.id} is not null),
          '[]'::jsonb
        )
      `,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .innerJoin(sql`users as owner`, eq(transactionSeries.ownerId, sql`owner.id`))
    .leftJoin(sql`users as pay_to`, eq(transactionSeries.payToId, sql`pay_to.id`))
    .leftJoin(transactionTags, eq(transactionTags.transactionId, transactionSeries.id))
    .leftJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(
      and(
        Array.isArray(orgIds)
          ? inArray(transactionSeries.organizationId, orgIds)
          : eq(transactionSeries.organizationId, orgIds),
        eq(transactionOccurrences.status, 'pending'),
        gte(transactionOccurrences.dueDate, today),
        lte(transactionOccurrences.dueDate, fourDaysFromNow),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )
    .groupBy(
      transactionOccurrences.id,
      transactionOccurrences.seriesId,
      transactionSeries.title,
      transactionSeries.amount,
      transactionOccurrences.dueDate,
      transactionOccurrences.status,
      transactionSeries.ownerId,
      sql`owner.name`,
      sql`owner.phone`,
      transactionSeries.payToId,
      sql`pay_to.name`,
      sql`pay_to.email`,
      sql`pay_to.phone`,
      transactionOccurrences.description,
      transactionSeries.installmentsTotal
    )

  // Calcular installmentsPaid para cada série
  const seriesIds = Array.from(new Set(upcomingTransactions.map(t => t.seriesId)))
  const paidMap: Record<string, number> = {}

  if (seriesIds.length > 0) {
    const paidRows = await db
      .select({
        seriesId: transactionOccurrences.seriesId,
        paid: sql<number>`count(*)`,
      })
      .from(transactionOccurrences)
      .where(
        and(
          inArray(transactionOccurrences.seriesId, seriesIds),
          eq(transactionOccurrences.status, 'paid')
        )
      )
      .groupBy(transactionOccurrences.seriesId)

    for (const r of paidRows) paidMap[r.seriesId] = Number(r.paid)
  }

  const processedTransactions = upcomingTransactions.map(transaction => {
    const dueDate = new Date(transaction.dueDate)
    dueDate.setHours(0, 0, 0, 0)

    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

    let alertType: 'warning' | 'urgent' | 'overdue'
    if (daysUntilDue === 0) {
      alertType = 'urgent'
    } else if (daysUntilDue === 1) {
      alertType = 'urgent'
    } else if (daysUntilDue === 2) {
      alertType = 'warning'
    } else {
      alertType = 'warning'
    }

    return {
      id: transaction.id,
      seriesId: transaction.seriesId,
      title: transaction.title,
      amount: Number(transaction.amount) / 100,
      dueDate: transaction.dueDate,
      daysUntilDue,
      alertType,
      ownerId: transaction.ownerId,
      ownerName: transaction.ownerName,
      ownerPhone: transaction.ownerPhone,
      payToName: transaction.payToName,
      payToEmail: transaction.payToEmail,
      payToPhone: transaction.payToPhone,
      description: transaction.description,
      tags: transaction.tags,
      installmentsTotal: transaction.installmentsTotal,
      installmentsPaid: paidMap[transaction.seriesId] ?? 0,
    }
  })

  const summary = {
    total: processedTransactions.length,
    today: processedTransactions.filter(t => t.daysUntilDue === 0).length,
    tomorrow: processedTransactions.filter(t => t.daysUntilDue === 1).length,
    twoDays: processedTransactions.filter(t => t.daysUntilDue === 2).length,
    threeToFourDays: processedTransactions.filter(t => t.daysUntilDue >= 3).length,
  }

  return {
    transactions: processedTransactions,
    summary,
  }
}

// Export para relatórios do dashboard
export async function getTransactionReports(
  orgIds: string | string[],
  userId?: string
): Promise<{
  overdueTransactions: {
    transactions: Array<{
      id: string
      seriesId: string
      title: string
      amount: number
      dueDate: Date
      daysOverdue: number
      ownerId: string
      ownerName: string
      ownerPhone: string
      payToName: string | null
      payToEmail: string | null
      payToPhone: string | null
      installmentsTotal: number | null
      installmentsPaid: number
    }>
    summary: {
      total: number
    }
  }
  paidThisMonth: {
    transactions: Array<{
      id: string
      seriesId: string
      title: string
      amount: number
      dueDate: Date
      paidAt: Date | null
      ownerId: string
      ownerName: string
      payToId: string | null
      payToName: string | null
    }>
    summary: {
      total: number
      totalAmount: number
    }
  }
  upcomingAlerts: {
    transactions: Array<{
      id: string
      seriesId: string
      title: string
      amount: number
      dueDate: Date
      daysUntilDue: number
      alertType: 'warning' | 'urgent' | 'overdue'
      ownerId: string
      ownerName: string
      ownerPhone: string
      payToName: string | null
      payToPhone: string | null
    }>
    summary: {
      total: number
      today: number
      tomorrow: number
      twoDays: number
      threeToFourDays: number
    }
  }
  monthlyStats: {
    totalTransactions: number
    totalAmount: number
    paidTransactions: number
    pendingTransactions: number
    overdueTransactions: number
  }
  recentActivity: Array<{
    id: string
    title: string
    amount: number
    status: 'paid' | 'pending'
    dueDate: Date
    ownerName: string
    updatedAt: Date
  }>
  chartData: {
    dailyTransactions: Array<{
      date: string
      paid: number
      pending: number
      total: number
    }>
    monthlyTrend: Array<{
      month: string
      total: number
      paid: number
      pending: number
    }>
    categoryBreakdown: Array<{
      category: string
      count: number
      totalAmount: number
    }>
    statusDistribution: {
      paid: number
      pending: number
      overdue: number
    }
  }
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fourDaysFromNow = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
  fourDaysFromNow.setHours(23, 59, 59, 999)

  // Buscar alertas próximos (reutilizando a lógica do preview)
  const upcomingAlerts = await previewTransactionAlerts(orgIds, userId)

  // Buscar transações vencidas
  const overdueTransactions = await db
    .select({
      id: transactionOccurrences.id,
      seriesId: transactionOccurrences.seriesId,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      dueDate: transactionOccurrences.dueDate,
      ownerId: transactionSeries.ownerId,
      ownerName: sql<string>`owner.name`,
      ownerPhone: sql<string>`owner.phone`,
      payToId: transactionSeries.payToId,
      payToName: sql<string>`pay_to.name`,
      payToEmail: sql<string>`pay_to.email`,
      payToPhone: sql<string>`pay_to.phone`,
      description: transactionOccurrences.description,
      installmentsTotal: transactionSeries.installmentsTotal,
      tags: sql<{ name: string; color: string }[]>`
        coalesce(
          jsonb_agg(distinct jsonb_build_object('name', ${tags.name}, 'color', ${tags.color}))
            filter (where ${tags.id} is not null),
          '[]'::jsonb
        )
      `,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .innerJoin(sql`users as owner`, eq(transactionSeries.ownerId, sql`owner.id`))
    .leftJoin(sql`users as pay_to`, eq(transactionSeries.payToId, sql`pay_to.id`))
    .leftJoin(transactionTags, eq(transactionTags.transactionId, transactionSeries.id))
    .leftJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(
      and(
        Array.isArray(orgIds)
          ? inArray(transactionSeries.organizationId, orgIds)
          : eq(transactionSeries.organizationId, orgIds),
        eq(transactionOccurrences.status, 'pending'),
        lt(transactionOccurrences.dueDate, today),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )
    .groupBy(
      transactionOccurrences.id,
      transactionOccurrences.seriesId,
      transactionSeries.title,
      transactionOccurrences.amount,
      transactionOccurrences.dueDate,
      transactionSeries.ownerId,
      sql`owner.name`,
      sql`owner.phone`,
      transactionSeries.payToId,
      sql`pay_to.name`,
      sql`pay_to.email`,
      sql`pay_to.phone`,
      transactionOccurrences.description,
      transactionSeries.installmentsTotal
    )
    .orderBy(transactionOccurrences.dueDate)

  // Calcular installmentsPaid para transações vencidas
  const overdueSeriesIds = Array.from(new Set(overdueTransactions.map(t => t.seriesId)))
  const overduePaidMap: Record<string, number> = {}

  if (overdueSeriesIds.length > 0) {
    const overduePaidRows = await db
      .select({
        seriesId: transactionOccurrences.seriesId,
        paid: sql<number>`count(*)`,
      })
      .from(transactionOccurrences)
      .where(
        and(
          inArray(transactionOccurrences.seriesId, overdueSeriesIds),
          eq(transactionOccurrences.status, 'paid')
        )
      )
      .groupBy(transactionOccurrences.seriesId)

    for (const r of overduePaidRows) overduePaidMap[r.seriesId] = Number(r.paid)
  }

  const processedOverdueTransactions = overdueTransactions.map(transaction => {
    const dueDate = new Date(transaction.dueDate)
    dueDate.setHours(0, 0, 0, 0)

    const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))

    return {
      id: transaction.id,
      seriesId: transaction.seriesId,
      title: transaction.title,
      amount: Number(transaction.amount) / 100,
      dueDate: transaction.dueDate,
      daysOverdue,
      ownerId: transaction.ownerId,
      ownerName: transaction.ownerName,
      ownerPhone: transaction.ownerPhone,
      payToName: transaction.payToName,
      payToEmail: transaction.payToEmail,
      payToPhone: transaction.payToPhone,
      description: transaction.description,
      tags: transaction.tags,
      installmentsTotal: transaction.installmentsTotal,
      installmentsPaid: overduePaidMap[transaction.seriesId] ?? 0,
    }
  })

  // Buscar estatísticas mensais
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

  const monthlyStats = await db
    .select({
      totalTransactions: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${transactionOccurrences.amount})`,
      paidTransactions: sql<number>`count(case when ${transactionOccurrences.status} = 'paid' then 1 end)`,
      pendingTransactions: sql<number>`count(case when ${transactionOccurrences.status} = 'pending' then 1 end)`,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .where(
      and(
        Array.isArray(orgIds)
          ? inArray(transactionSeries.organizationId, orgIds)
          : eq(transactionSeries.organizationId, orgIds),
        gte(transactionOccurrences.dueDate, startOfMonth),
        lte(transactionOccurrences.dueDate, endOfMonth),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )

  // Buscar transações vencidas separadamente
  const overdueCount = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .where(
      and(
        Array.isArray(orgIds)
          ? inArray(transactionSeries.organizationId, orgIds)
          : eq(transactionSeries.organizationId, orgIds),
        eq(transactionOccurrences.status, 'pending'),
        lt(transactionOccurrences.dueDate, today),
        gte(transactionOccurrences.dueDate, startOfMonth),
        lte(transactionOccurrences.dueDate, endOfMonth),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )

  // Buscar atividade recente (últimas 10 transações atualizadas)
  const recentActivity = await db
    .select({
      id: transactionOccurrences.id,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      status: transactionOccurrences.status,
      dueDate: transactionOccurrences.dueDate,
      ownerName: sql<string>`owner.name`,
      updatedAt: transactionOccurrences.updatedAt,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .innerJoin(sql`users as owner`, eq(transactionSeries.ownerId, sql`owner.id`))
    .where(
      and(
        Array.isArray(orgIds)
          ? inArray(transactionSeries.organizationId, orgIds)
          : eq(transactionSeries.organizationId, orgIds),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )
    .orderBy(sql`${transactionOccurrences.updatedAt} desc`)
    .limit(10)

  // Transações pagas no mês
  const paidThisMonthRows = await db
    .select({
      id: transactionOccurrences.id,
      seriesId: transactionOccurrences.seriesId,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      dueDate: transactionOccurrences.dueDate,
      paidAt: transactionOccurrences.paidAt,
      ownerId: transactionSeries.ownerId,
      ownerName: sql<string>`owner.name`,
      payToId: transactionSeries.payToId,
      payToName: sql<string>`pay_to.name`,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .innerJoin(sql`users as owner`, eq(transactionSeries.ownerId, sql`owner.id`))
    .leftJoin(sql`users as pay_to`, eq(transactionSeries.payToId, sql`pay_to.id`))
    .where(
      and(
        Array.isArray(orgIds)
          ? inArray(transactionSeries.organizationId, orgIds)
          : eq(transactionSeries.organizationId, orgIds),
        eq(transactionOccurrences.status, 'paid'),
        gte(transactionOccurrences.dueDate, startOfMonth),
        lte(transactionOccurrences.dueDate, endOfMonth),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )
    .orderBy(sql`${transactionOccurrences.paidAt} desc`)

  // Gerar dados para gráficos
  const chartData = await generateChartData(today, String(orgIds), userId)

  return {
    overdueTransactions: {
      transactions: processedOverdueTransactions,
      summary: {
        total: processedOverdueTransactions.length,
      },
    },
    paidThisMonth: {
      transactions: paidThisMonthRows.map(row => ({
        id: row.id,
        seriesId: row.seriesId,
        title: row.title,
        amount: Number(row.amount) / 100,
        dueDate: row.dueDate,
        paidAt: row.paidAt ?? null,
        ownerId: row.ownerId,
        ownerName: row.ownerName,
        payToId: row.payToId ?? null,
        payToName: row.payToName ?? null,
      })),
      summary: {
        total: paidThisMonthRows.length,
        totalAmount: paidThisMonthRows.reduce((acc, r) => acc + Number(r.amount) / 100, 0),
      },
    },
    upcomingAlerts: {
      ...upcomingAlerts,
      transactions: upcomingAlerts.transactions.map(transaction => ({
        ...transaction,
        seriesId: transaction.seriesId,
        ownerId: transaction.ownerId || '', // Adicionar ownerId se não existir
      })),
    },
    monthlyStats: {
      totalTransactions: monthlyStats[0]?.totalTransactions || 0,
      totalAmount: Number(monthlyStats[0]?.totalAmount || 0) / 100,
      paidTransactions: monthlyStats[0]?.paidTransactions || 0,
      pendingTransactions: monthlyStats[0]?.pendingTransactions || 0,
      overdueTransactions: overdueCount[0]?.count || 0,
    },
    recentActivity: recentActivity.map(activity => ({
      id: activity.id,
      title: activity.title,
      amount: Number(activity.amount) / 100,
      status: activity.status as 'paid' | 'pending',
      dueDate: activity.dueDate,
      ownerName: activity.ownerName,
      updatedAt: activity.updatedAt,
    })),
    chartData,
  }
}

// Função auxiliar para gerar dados dos gráficos
async function generateChartData(today: Date, orgId: string, userId?: string) {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

  // Dados diários do mês atual
  const dailyData = await db
    .select({
      date: sql<string>`DATE(${transactionOccurrences.dueDate})`,
      status: transactionOccurrences.status,
      amount: transactionOccurrences.amount,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .where(
      and(
        eq(transactionSeries.organizationId, orgId),
        gte(transactionOccurrences.dueDate, startOfMonth),
        lte(transactionOccurrences.dueDate, endOfMonth),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )

  // Processar dados diários
  const dailyMap = new Map<string, { paid: number; pending: number; total: number }>()

  dailyData.forEach(item => {
    const date = item.date
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { paid: 0, pending: 0, total: 0 })
    }

    const dayData = dailyMap.get(date)!
    const amount = Number(item.amount) / 100

    if (item.status === 'paid') {
      dayData.paid += amount
    } else {
      dayData.pending += amount
    }
    dayData.total += amount
  })

  // Gerar array com todos os dias do mês
  const dailyTransactions = []
  const currentDate = new Date(startOfMonth)

  while (currentDate <= endOfMonth) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayData = dailyMap.get(dateStr) || { paid: 0, pending: 0, total: 0 }

    dailyTransactions.push({
      date: dateStr,
      ...dayData,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Dados mensais dos últimos 6 meses
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999)

    const monthData = await db
      .select({
        status: transactionOccurrences.status,
        amount: transactionOccurrences.amount,
      })
      .from(transactionOccurrences)
      .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
      .where(
        and(
          eq(transactionSeries.organizationId, orgId),
          gte(transactionOccurrences.dueDate, monthDate),
          lte(transactionOccurrences.dueDate, monthEnd),
          userId
            ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
            : sql`true`
        )
      )

    const monthStats = monthData.reduce(
      (acc, item) => {
        const amount = Number(item.amount) / 100
        acc.total += amount
        if (item.status === 'paid') {
          acc.paid += amount
        } else {
          acc.pending += amount
        }
        return acc
      },
      { total: 0, paid: 0, pending: 0 }
    )

    monthlyTrend.push({
      month: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      ...monthStats,
    })
  }

  // Breakdown por categoria (usando tags)
  const categoryData = await db
    .select({
      tagName: sql<string>`tags.name`,
      amount: transactionOccurrences.amount,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .innerJoin(transactionTags, eq(transactionOccurrences.seriesId, transactionTags.transactionId))
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(
      and(
        eq(transactionSeries.organizationId, orgId),
        gte(transactionOccurrences.dueDate, startOfMonth),
        lte(transactionOccurrences.dueDate, endOfMonth),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )

  const categoryMap = new Map<string, { count: number; totalAmount: number }>()

  categoryData.forEach(item => {
    const tagName = item.tagName
    if (!categoryMap.has(tagName)) {
      categoryMap.set(tagName, { count: 0, totalAmount: 0 })
    }

    const categoryData = categoryMap.get(tagName)!
    categoryData.count += 1
    categoryData.totalAmount += Number(item.amount) / 100
  })

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  }))

  // Distribuição de status
  const statusData = await db
    .select({
      status: transactionOccurrences.status,
      count: sql<number>`count(*)`,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .where(
      and(
        eq(transactionSeries.organizationId, orgId),
        gte(transactionOccurrences.dueDate, startOfMonth),
        lte(transactionOccurrences.dueDate, endOfMonth)
      )
    )
    .groupBy(transactionOccurrences.status)

  const statusDistribution = {
    paid: 0,
    pending: 0,
    overdue: 0,
  }

  statusData.forEach(item => {
    if (item.status === 'paid') {
      statusDistribution.paid = item.count
    } else {
      statusDistribution.pending = item.count
    }
  })

  // Calcular vencidas
  const overdueCount = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .where(
      and(
        eq(transactionSeries.organizationId, orgId),
        eq(transactionOccurrences.status, 'pending'),
        lt(transactionOccurrences.dueDate, today),
        gte(transactionOccurrences.dueDate, startOfMonth),
        lte(transactionOccurrences.dueDate, endOfMonth),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )

  statusDistribution.overdue = overdueCount[0]?.count || 0

  return {
    dailyTransactions,
    monthlyTrend,
    categoryBreakdown,
    statusDistribution,
  }
}
