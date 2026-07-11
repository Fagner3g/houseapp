import { sql } from 'drizzle-orm'

import { client, db } from '@/db'
import { notifications } from '@/db/schemas/notifications'

async function main() {
  const startOfTodaySp = sql`(date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`

  const deleted = await db
    .delete(notifications)
    .where(sql`${notifications.createdAt} >= ${startOfTodaySp}`)
    .returning({ id: notifications.id, channel: notifications.channel })

  console.log(`Deleted ${deleted.length} notification(s) from today (America/Sao_Paulo)`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => client.end())
