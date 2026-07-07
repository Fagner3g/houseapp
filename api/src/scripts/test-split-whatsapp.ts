import dayjs from 'dayjs'

import { container } from '@/core/container'
import { computeDaysUntilDue } from '@/modules/alerts/alert-utils'
import { resolveSplitAlertDueDate } from '@/modules/alerts/resolve-transaction-alert-due-date'

const ORG_ID = process.env.TEST_ORG_ID ?? 'evinuc11b703favg1bchx4bn'
const KAROLINE_ID = process.env.TEST_USER_ID ?? 'h64u9muauvyqvr2cajoqz8um'

async function main() {
  console.log('=== Teste de envio manual unificado (sem regras de dias) ===\n')

  const splits = await container.splitRepository.listNotifyEnabledPending(ORG_ID)
  const karolineSplits = splits.filter(split => split.userId === KAROLINE_ID)

  console.log(`Splits pendentes da Karoline: ${karolineSplits.length}`)
  for (const split of karolineSplits) {
    const dueDate = resolveSplitAlertDueDate({
      transactionDate: split.transactionDate,
      competenceDate: split.competenceDate,
      installmentNumber: split.installmentNumber,
      type: split.transactionType,
      accountType: split.accountType,
      closingDay: split.closingDay,
      dueDay: split.dueDay,
    })

    console.log(
      `  • ${split.transactionTitle} — vence ${dayjs(dueDate).format('DD/MM/YYYY')} (${computeDaysUntilDue(dueDate)} dias)`
    )
  }

  if (karolineSplits.length < 2) {
    console.error('\nEsperava pelo menos 2 splits para testar a mensagem unificada.')
    process.exit(1)
  }

  console.log('\nEnviando via sendManualMemberAlerts (tipo: upcoming)...\n')
  const result = await container.alertRuleService.sendManualMemberAlerts(
    ORG_ID,
    KAROLINE_ID,
    'upcoming'
  )

  console.log('Resultado:', result)

  if (result.sent === 1 && result.errors === 0) {
    console.log('\n✅ 1 mensagem enviada. Confira o WhatsApp — deve ter as 2 compras unificadas.')
    process.exit(0)
  }

  console.error('\n❌ Envio não concluiu como esperado.')
  process.exit(1)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
