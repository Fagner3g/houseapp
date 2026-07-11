import { AlertsAutoRulesCard } from './alerts-auto-rules-card'
import { AlertsManualSendCard } from './alerts-manual-send-card'

export function AlertsSettingsTab() {
  return (
    <div className="space-y-4">
      <AlertsAutoRulesCard />
      <AlertsManualSendCard />
    </div>
  )
}
