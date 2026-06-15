import { describe, expect, it, vi, beforeEach } from 'vitest'

import { resolveReminderAlertConfig } from './resolve-reminder-alert-config'
import { resolveReminderAlertRule } from './resolve-reminder-alert-rule'

vi.mock('./resolve-reminder-alert-config', () => ({
  resolveReminderAlertConfig: vi.fn(),
}))

const mockedResolveConfig = vi.mocked(resolveReminderAlertConfig)

function buildReminder() {
  return {
    id: 'rem-1',
    organizationId: 'org-1',
    useOrgAlertDefaults: true,
    daysBefore: [1, 0],
    overdueAlertFrequency: 'weekly' as const,
    overdueAlertInterval: 1,
    channels: ['in_app'] as const,
  } as never
}

describe('resolveReminderAlertRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps resolved config to rule-like shape', async () => {
    mockedResolveConfig.mockResolvedValue({
      channels: ['whatsapp'],
      config: { daysBefore: [1, 0] },
      ruleId: 'rule-1',
    })

    const result = await resolveReminderAlertRule(buildReminder(), 'upcoming')

    expect(mockedResolveConfig).toHaveBeenCalledWith(buildReminder(), 'upcoming')
    expect(result).toEqual({
      id: 'rule-1',
      channels: ['whatsapp'],
      config: { daysBefore: [1, 0] },
    })
  })

  it('returns null when config cannot be resolved', async () => {
    mockedResolveConfig.mockResolvedValue(null)

    const result = await resolveReminderAlertRule(buildReminder(), 'overdue')

    expect(result).toBeNull()
  })
})
