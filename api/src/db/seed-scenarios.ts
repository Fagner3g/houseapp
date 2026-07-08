/**
 * Cenários de teste para fluxos financeiros (cartão, fatura, pagamentos).
 *
 * Referência: 01/jul/2026
 * Uso: npm run seed:scenarios
 */
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { eq, inArray } from 'drizzle-orm'

import { client, db } from '.'
import { accounts } from './schemas/accounts'
import { alertRules } from './schemas/alertRules'
import { cards } from './schemas/cards'
import { categories } from './schemas/categories'
import { notifications } from './schemas/notifications'
import { organizations } from './schemas/organizations'
import { recurringTransactions } from './schemas/recurringTransactions'
import { splitPayments } from './schemas/splitPayments'
import { statements } from './schemas/statements'
import { transactionAttachments } from './schemas/transactionAttachments'
import { transactionCategories } from './schemas/transactionCategories'
import { transactionSplits } from './schemas/transactionSplits'
import { transactions } from './schemas/transactions'
import { users } from './schemas/users'
import {
  ensureDefaultCategories,
  getCategoryIdByName,
  getOrganizationCategories,
} from '@/modules/categories/default-categories'

dayjs.extend(utc)

const ORG_SLUG = 'casa'

function at(year: number, month: number, day: number, hour = 12) {
  return dayjs.utc().year(year).month(month - 1).date(day).hour(hour).minute(0).second(0).millisecond(0).toDate()
}

async function findOrg() {
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, ORG_SLUG))
  if (!org) {
    throw new Error(`Organização "${ORG_SLUG}" não encontrada. Rode npm run seed primeiro.`)
  }
  return org
}

async function clearFinancialData(organizationId: string) {
  const orgTxIds = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.organizationId, organizationId))

  const txIds = orgTxIds.map(row => row.id)

  if (txIds.length) {
    const splitRows = await db
      .select({ id: transactionSplits.id })
      .from(transactionSplits)
      .where(inArray(transactionSplits.transactionId, txIds))

    const splitIdList = splitRows.map(row => row.id)
    if (splitIdList.length) {
      await db.delete(splitPayments).where(inArray(splitPayments.splitId, splitIdList))
      await db.delete(transactionSplits).where(inArray(transactionSplits.id, splitIdList))
    }

    await db.delete(transactionAttachments).where(inArray(transactionAttachments.transactionId, txIds))
    await db.delete(transactionCategories).where(inArray(transactionCategories.transactionId, txIds))
    await db.delete(transactions).where(eq(transactions.organizationId, organizationId))
  }

  await db.delete(statements).where(eq(statements.organizationId, organizationId))
  await db.delete(notifications).where(eq(notifications.organizationId, organizationId))
  await db.delete(alertRules).where(eq(alertRules.organizationId, organizationId))
  await db.delete(recurringTransactions).where(eq(recurringTransactions.organizationId, organizationId))

  const orgAccountIds = (
    await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.organizationId, organizationId))
  ).map(row => row.id)

  if (orgAccountIds.length) {
    await db.delete(cards).where(inArray(cards.accountId, orgAccountIds))
  }

  await db.delete(accounts).where(eq(accounts.organizationId, organizationId))
  await db.delete(categories).where(eq(categories.organizationId, organizationId))
}

async function seedScenarios() {
  const org = await findOrg()
  const [owner] = await db.select().from(users).where(eq(users.id, org.ownerId))

  console.log(`\nLimpando dados financeiros da org "${ORG_SLUG}"...`)
  await clearFinancialData(org.id)

  await ensureDefaultCategories(org.id)
  const categoryRows = await getOrganizationCategories(org.id)
  const mercado = getCategoryIdByName(categoryRows, 'Supermercado', 'expense')
  const transporte = getCategoryIdByName(categoryRows, 'Transporte', 'expense')
  const restaurantes = getCategoryIdByName(categoryRows, 'Restaurantes & Delivery', 'expense')
  const compras = getCategoryIdByName(categoryRows, 'Vestuário & Acessórios', 'expense')
  const salario = getCategoryIdByName(categoryRows, 'Salário', 'income')
  const moradia = getCategoryIdByName(categoryRows, 'Moradia / Contas & Manutenção', 'expense')
  const lazer = getCategoryIdByName(categoryRows, 'Lazer & Entretenimento', 'expense')
  const saude = getCategoryIdByName(categoryRows, 'Saúde', 'expense')

  const [nubank, itauChecking] = await db
    .insert(accounts)
    .values([
      {
        organizationId: org.id,
        name: 'Nubank Ultravioleta',
        type: 'credit_card',
        institution: 'nubank',
        creditLimit: 1035000n,
        closingDay: 1,
        dueDay: 8,
        initialBalance: 0n,
        color: '#7C3AED',
        icon: 'credit-card',
        displayOrder: 0,
      },
      {
        organizationId: org.id,
        name: 'Conta Corrente Itaú',
        type: 'checking',
        institution: 'itau',
        initialBalance: 250000n,
        pixKey: owner.email,
        pixKeyType: 'email',
        color: '#F97316',
        icon: 'landmark',
        displayOrder: 1,
      },
      {
        organizationId: org.id,
        name: 'Carteira',
        type: 'cash',
        initialBalance: 378n,
        color: '#10B981',
        icon: 'wallet',
        displayOrder: 2,
      },
    ])
    .returning()

  const [nubankCard] = await db
    .insert(cards)
    .values({
      accountId: nubank.id,
      label: 'Principal',
      lastFourDigits: '4532',
      type: 'physical',
      holderName: owner.name,
      brand: 'mastercard',
      status: 'active',
    })
    .returning()

  // ─── A) Nubank jul/2026 — fatura em aberto, VENCE NO FUTURO (08/ago) ─────────
  const [nubankJulStatement] = await db
    .insert(statements)
    .values({
      organizationId: org.id,
      accountId: nubank.id,
      periodStart: at(2026, 6, 2),
      periodEnd: at(2026, 7, 1),
      closingDate: at(2026, 7, 1),
      dueDate: at(2026, 8, 8),
      totalAmount: 157117n,
      minimumPayment: 157117n,
      previousBalance: 0n,
      paymentsReceived: 0n,
      purchasesTotal: 157117n,
      otherCharges: 0n,
      transactionsCount: 8,
      fileHash: 'b7e4f2a91c038d5e6f1b9c4a8d3e5f7092d6b9c4e8f3a2047b0d9c6e4f8a2153',
      fileName: 'Nubank_jul-2026-em-aberto.pdf',
      importedBy: owner.id,
    })
    .returning()

  const nubankJulPurchases = await db
    .insert(transactions)
    .values([
      {
        organizationId: org.id,
        accountId: nubank.id,
        cardId: nubankCard.id,
        statementId: nubankJulStatement.id,
        title: 'Netflix',
        amount: 5590n,
        type: 'expense',
        date: at(2026, 7, 2),
        status: 'pending',
        source: 'import',
        externalId: 'nubank-jul-netflix',
      },
      {
        organizationId: org.id,
        accountId: nubank.id,
        cardId: nubankCard.id,
        statementId: nubankJulStatement.id,
        title: 'Uber *Trip',
        amount: 3247n,
        type: 'expense',
        date: at(2026, 7, 8),
        status: 'pending',
        source: 'import',
        externalId: 'nubank-jul-uber',
      },
      {
        organizationId: org.id,
        accountId: nubank.id,
        cardId: nubankCard.id,
        statementId: nubankJulStatement.id,
        title: 'Mercado Extra',
        amount: 110080n,
        type: 'expense',
        date: at(2026, 7, 20),
        status: 'pending',
        source: 'import',
        externalId: 'nubank-jul-mercado',
      },
      {
        organizationId: org.id,
        accountId: nubank.id,
        cardId: nubankCard.id,
        statementId: nubankJulStatement.id,
        title: 'iFood',
        amount: 5270n,
        type: 'expense',
        date: at(2026, 7, 5),
        status: 'pending',
        source: 'import',
        externalId: 'nubank-jul-ifood',
      },
      {
        organizationId: org.id,
        accountId: nubank.id,
        cardId: nubankCard.id,
        statementId: nubankJulStatement.id,
        title: 'Spotify',
        amount: 3490n,
        type: 'expense',
        date: at(2026, 7, 3),
        status: 'pending',
        source: 'import',
        externalId: 'nubank-jul-spotify',
      },
      {
        organizationId: org.id,
        accountId: nubank.id,
        cardId: nubankCard.id,
        statementId: nubankJulStatement.id,
        title: 'Cinemark',
        amount: 4500n,
        type: 'expense',
        date: at(2026, 7, 12),
        status: 'pending',
        source: 'import',
        externalId: 'nubank-jul-cinema',
      },
      {
        organizationId: org.id,
        accountId: nubank.id,
        cardId: nubankCard.id,
        statementId: nubankJulStatement.id,
        title: 'Drogasil',
        amount: 8950n,
        type: 'expense',
        date: at(2026, 7, 10),
        status: 'pending',
        source: 'import',
        externalId: 'nubank-jul-farmacia',
      },
      {
        organizationId: org.id,
        accountId: nubank.id,
        cardId: nubankCard.id,
        statementId: nubankJulStatement.id,
        title: 'Amazon BR',
        amount: 15990n,
        type: 'expense',
        date: at(2026, 7, 15),
        status: 'pending',
        source: 'import',
        externalId: 'nubank-jul-amazon',
      },
    ])
    .returning()

  // ─── C) Conta corrente — vencido, prestes a vencer, futuro (mês passado/jul) ─
  const [salaryTx, overdueTx, dueSoonTx, futureTx1, futureTx2] = await db
    .insert(transactions)
    .values([
      {
        organizationId: org.id,
        accountId: itauChecking.id,
        title: 'Salário junho',
        amount: 850000n,
        type: 'income',
        date: at(2026, 6, 30),
        status: 'paid',
        paidAt: at(2026, 6, 30),
        paidAmount: 850000n,
        counterparty: 'Empresa',
        source: 'manual',
      },
      {
        organizationId: org.id,
        accountId: itauChecking.id,
        title: 'Internet Vivo',
        amount: 11990n,
        type: 'expense',
        date: at(2026, 6, 15),
        status: 'pending',
        counterparty: 'Vivo',
        source: 'manual',
      },
      {
        organizationId: org.id,
        accountId: itauChecking.id,
        title: 'Energia Cemig',
        amount: 28750n,
        type: 'expense',
        date: at(2026, 7, 3),
        status: 'pending',
        counterparty: 'Cemig',
        source: 'manual',
      },
      {
        organizationId: org.id,
        accountId: itauChecking.id,
        title: 'Aluguel',
        amount: 220000n,
        type: 'expense',
        date: at(2026, 7, 15),
        status: 'pending',
        counterparty: 'Imobiliária',
        source: 'manual',
      },
      {
        organizationId: org.id,
        accountId: itauChecking.id,
        title: 'Condomínio',
        amount: 65000n,
        type: 'expense',
        date: at(2026, 7, 25),
        status: 'pending',
        counterparty: 'Síndico',
        source: 'manual',
      },
    ])
    .returning()

  await db.insert(transactionCategories).values([
    { transactionId: nubankJulPurchases[0].id, categoryId: moradia },
    { transactionId: nubankJulPurchases[1].id, categoryId: transporte },
    { transactionId: nubankJulPurchases[2].id, categoryId: mercado },
    { transactionId: nubankJulPurchases[3].id, categoryId: restaurantes },
    { transactionId: nubankJulPurchases[4].id, categoryId: moradia },
    { transactionId: nubankJulPurchases[5].id, categoryId: lazer },
    { transactionId: nubankJulPurchases[6].id, categoryId: saude },
    { transactionId: nubankJulPurchases[7].id, categoryId: compras },
    { transactionId: salaryTx.id, categoryId: salario },
    { transactionId: overdueTx.id, categoryId: moradia },
    { transactionId: dueSoonTx.id, categoryId: moradia },
    { transactionId: futureTx1.id, categoryId: moradia },
    { transactionId: futureTx2.id, categoryId: moradia },
  ])

  console.log('\n✓ Cenários de teste aplicados com sucesso.\n')
  console.log('Organização:', ORG_SLUG, `(${owner.email})`)
  console.log('Data de referência: 01/jul/2026')
  console.log('')
  console.log('┌─ CARTÃO NUBANK (/casa/credit-cards) ───────────────────────────────────')
  console.log('│')
  console.log('│  A) Fatura jul/2026 em aberto')
  console.log('│     R$ 1.571,17 · vencimento 08/ago · FUTURO')
  console.log('│     8 compras categorizadas no cartão')
  console.log('│')
  console.log('├─ CONTA CORRENTE (/casa/accounts) ──────────────────────────────────────')
  console.log('│')
  console.log('│  B) Lançamentos avulsos de jun/jul:')
  console.log('│     · Internet Vivo R$ 119,90 — venc. 15/jun — VENCIDA')
  console.log('│     · Energia Cemig R$ 287,50 — venc. 03/jul — PRESTES A VENCER')
  console.log('│     · Aluguel R$ 2.200,00 — venc. 15/jul — FUTURO')
  console.log('│     · Condomínio R$ 650,00 — venc. 25/jul — FUTURO')
  console.log('│     · Salário junho R$ 8.500,00 — PAGO')
  console.log('│')
  console.log('├─ OUTROS ───────────────────────────────────────────────────────────────')
  console.log('│  Carteira: saldo inicial R$ 3,78')
  console.log('└──────────────────────────────────────────────────────────────────────')
  console.log('')
  console.log(`Faturas importadas: 1`)
  console.log(`Transações: ${nubankJulPurchases.length + 5}`)
}

seedScenarios()
  .catch(error => {
    console.error('Erro ao aplicar cenários:', error)
    process.exitCode = 1
  })
  .finally(() => client.end())
