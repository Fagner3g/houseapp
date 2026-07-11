import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'
import { container } from '@/core/container'
import { runSendWhatsappAlertsNow } from '@/jobs/send-whatsapp-alerts'

async function main() {
  const orgs = await db.select().from(organizations)
  console.log('Orgs:', orgs.map(o => o.name).join(', '))

  let evaluated = 0
  for (const org of orgs) {
    const result = await container.alertRuleService.evaluateOrganization(org.id, 'all', {
      skipTimeCheck: true,
      skipOverdueThrottle: true,
    })
    evaluated += result.processed
    console.log(`evaluate ${org.name}: processed=${result.processed} errors=${result.errors}`)

    const targets = await container.alertRuleService.listManualAlertTargets(org.id)
    for (const target of targets) {
      for (const type of ['overdue', 'upcoming'] as const) {
        try {
          if (target.type === 'member' && target.userId) {
            const sent = await container.alertRuleService.sendManualMemberAlerts(
              org.id,
              target.userId,
              type
            )
            console.log(
              `  manual ${org.name} · ${target.name} · ${type}: sent=${sent.sent} errors=${sent.errors}`
            )
          } else if (target.type === 'contact') {
            const sent = await container.alertRuleService.sendManualContactAlerts(
              org.id,
              target.key,
              type
            )
            console.log(
              `  manual ${org.name} · ${target.name} · ${type}: sent=${sent.sent} errors=${sent.errors}`
            )
          }
        } catch (error) {
          console.log(
            `  manual ${org.name} · ${target.name} · ${type}: FAIL`,
            error instanceof Error ? error.message : error
          )
        }
      }
    }
  }

  console.log('total evaluated notifications created:', evaluated)

  const whatsapp = await runSendWhatsappAlertsNow()
  console.log('whatsapp job:', whatsapp)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => process.exit(0))
