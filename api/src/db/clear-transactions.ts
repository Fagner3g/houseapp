import { sql } from 'drizzle-orm'

import { client, db } from '.'

async function clearTransactions() {
  const [before] = await db.execute<{
    transactions: number
    statements: number
    cards: number
    credit_card_accounts: number
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM transactions) AS transactions,
      (SELECT COUNT(*)::int FROM statements) AS statements,
      (SELECT COUNT(*)::int FROM cards) AS cards,
      (SELECT COUNT(*)::int FROM accounts WHERE type = 'credit_card') AS credit_card_accounts
  `)

  await db.execute(sql`
    TRUNCATE TABLE
      split_payments,
      transaction_splits,
      transaction_categories,
      transaction_attachments,
      notifications,
      alert_rules,
      transactions,
      recurring_transactions,
      statements,
      cards
    RESTART IDENTITY CASCADE
  `)

  await db.execute(sql`
    DELETE FROM accounts WHERE type = 'credit_card'
  `)

  const [after] = await db.execute<{
    transactions: number
    statements: number
    cards: number
    credit_card_accounts: number
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM transactions) AS transactions,
      (SELECT COUNT(*)::int FROM statements) AS statements,
      (SELECT COUNT(*)::int FROM cards) AS cards,
      (SELECT COUNT(*)::int FROM accounts WHERE type = 'credit_card') AS credit_card_accounts
  `)

  console.log(`Transações removidas: ${before?.transactions ?? 0}`)
  console.log(`Faturas removidas: ${before?.statements ?? 0}`)
  console.log(`Cartões físicos removidos: ${before?.cards ?? 0}`)
  console.log(`Contas de cartão removidas: ${before?.credit_card_accounts ?? 0}`)
  console.log(`Transações restantes: ${after?.transactions ?? 0}`)
  console.log(`Faturas restantes: ${after?.statements ?? 0}`)
  console.log(`Cartões físicos restantes: ${after?.cards ?? 0}`)
  console.log(`Contas de cartão restantes: ${after?.credit_card_accounts ?? 0}`)
}

clearTransactions().finally(() => client.end())
