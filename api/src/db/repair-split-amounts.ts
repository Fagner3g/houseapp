/**
 * Repairs splits stored at 1/100 of the expected amount (e.g. R$4.50 instead of R$450).
 *
 * Cause: money strings like "900" were parsed as centavos (R$9), so 50% splits became R$4.50.
 *
 * Usage: npm run db:repair-split-amounts
 */
import { sql } from 'drizzle-orm'

import { client, db } from '@/db'

async function main() {
  const result = await db.execute<{
    id: string
    new_amount: string
    title: string
    transaction_amount: string
  }>(sql`
    UPDATE transaction_splits AS ts
    SET
      amount = t.amount / 2,
      updated_at = NOW()
    FROM transactions AS t
    WHERE ts.transaction_id = t.id
      AND t.amount IS NOT NULL
      AND ts.amount > 0
      AND ts.amount < t.amount / 4
      AND ts.status IN ('pending', 'partial')
    RETURNING ts.id, ts.amount AS new_amount, t.title, t.amount AS transaction_amount
  `)

  const rows = Array.isArray(result) ? result : []
  console.log(`Repaired ${rows.length} split(s).`)
  for (const row of rows) {
    console.log(`  - ${row.title}: split amount → ${row.new_amount} centavos`)
  }
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end?.()
  })
