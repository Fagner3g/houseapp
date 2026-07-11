import { useListAlertRules } from '@/api/generated/api'
import type { ListAlertRules200RulesItem } from '@/api/generated/model/listAlertRules200RulesItem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import { AlertsRuleRow } from './alerts-rule-row'
import { AlertsScheduleRow } from './alerts-schedule-row'

function isOrgRule(rule: ListAlertRules200RulesItem) {
  return rule.scope === 'organization' && rule.isActive
}

function findOrgRule(rules: ListAlertRules200RulesItem[], triggerType: 'upcoming' | 'overdue') {
  return rules.find(rule => isOrgRule(rule) && rule.triggerType === triggerType)
}

export function AlertsAutoRulesCard() {
  const { slug } = useActiveOrganization()
  const { data, isLoading } = useListAlertRules(slug, { query: { enabled: !!slug } })

  const rules = data?.rules ?? []
  const upcomingRule = findOrgRule(rules, 'upcoming')
  const overdueRule = findOrgRule(rules, 'overdue')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras automáticas</CardTitle>
        <CardDescription>
          Horário e regras de lembretes da organização. Transações com lembretes ativos notificam
          todos os membros, cada um no seu telefone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AlertsScheduleRow />

        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando regras...</p>
        ) : (
          <div className="space-y-3">
            {upcomingRule && <AlertsRuleRow rule={upcomingRule} />}
            {overdueRule && <AlertsRuleRow rule={overdueRule} />}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
