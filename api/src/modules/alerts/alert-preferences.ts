import {
  DEFAULT_ALERT_PREFERENCES,
  type AlertPreferences,
} from '@/db/schemas/organizationMembers'
import type { AlertRuleChannel } from '@/db/schemas/alertRules'

export type { AlertPreferences }
export { DEFAULT_ALERT_PREFERENCES }

export function normalizeAlertPreferences(
  preferences: Partial<AlertPreferences> | null | undefined
): AlertPreferences {
  return {
    whatsapp: preferences?.whatsapp ?? DEFAULT_ALERT_PREFERENCES.whatsapp,
    inApp: preferences?.inApp ?? DEFAULT_ALERT_PREFERENCES.inApp,
    extension: preferences?.extension ?? DEFAULT_ALERT_PREFERENCES.extension,
  }
}

export function isAlertChannelEnabled(
  channel: AlertRuleChannel,
  notificationsEnabled: boolean,
  preferences: AlertPreferences | null | undefined
): boolean {
  const prefs = normalizeAlertPreferences(preferences)
  switch (channel) {
    case 'whatsapp':
      return notificationsEnabled && prefs.whatsapp
    case 'in_app':
      return prefs.inApp
    case 'extension':
      return prefs.extension
  }
}
