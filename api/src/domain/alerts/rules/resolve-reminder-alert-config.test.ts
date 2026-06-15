import { describe, expect, it, vi, beforeEach } from 'vitest'

import { resolveOrgAlertRule } from './resolve-org-alert-rule'
import { resolveReminderAlertConfig } from './resolve-reminder-alert-config'

vi.mock('./resolve-org-alert-rule', () => ({
  resolveOrgAlertRule: vi.fn(),
}))

const mockedResolveOrg = vi.mocked(resolveOrgAlertRule)

function buildReminder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rem-1',
    organizationId: 'org-1',
    createdBy: 'user-1',
    title: 'Pagar cartão',
    notes: null,
    dueDate: new Date('2026-06-15T12:00:00.000Z'),
    amountCents: null,
    daysBefore: [3, 1, 0],
    useOrgAlertDefaults: true,
    overdueAlertFrequency: 'weekly' as const,
    overdueAlertInterval: 2,
    channels: ['in_app', 'whatsapp'] as const,
    recipientUserId: 'user-1',
    active: true,
    completedAt: null,
    isRecurring: false,
    recurrenceType: null,
    recurrenceInterval: 1,
    recurrenceUntil: null,
    notifyHour: null,
    notifyMinute: null,
    linkedSeriesId: null,
    snoozedUntil: null,
    lastCompletedPeriodKey: null,
    generatesTransaction: false,
    defaultPayToId: null,
    transactionType: 'expense' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('resolveReminderAlertConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses org reminder rules when useOrgAlertDefaults is true', async () => {
    mockedResolveOrg.mockResolvedValue({
      id: 'org-rem-up',
      channels: ['extension'],
      config: { daysBefore: [7, 0] },
    } as never)

    const result = await resolveReminderAlertConfig(buildReminder(), 'upcoming')

    expect(mockedResolveOrg).toHaveBeenCalledWith('org-1', 'upcoming', 'reminder')
    expect(result).toEqual({
      channels: ['extension'],
      config: { daysBefore: [7, 0] },
      ruleId: 'org-rem-up',
    })
  })

  it('uses inline upcoming config when useOrgAlertDefaults is false', async () => {
    const result = await resolveReminderAlertConfig(
      buildReminder({ useOrgAlertDefaults: false }),
      'upcoming'
    )

    expect(mockedResolveOrg).not.toHaveBeenCalled()
    expect(result).toEqual({
      channels: ['in_app', 'whatsapp'],
      config: { daysBefore: [3, 1, 0] },
      ruleId: null,
    })
  })

  it('uses inline overdue config when useOrgAlertDefaults is false', async () => {
    const result = await resolveReminderAlertConfig(
      buildReminder({ useOrgAlertDefaults: false }),
      'overdue'
    )

    expect(result).toEqual({
      channels: ['in_app', 'whatsapp'],
      config: { frequency: 'weekly', interval: 2 },
      ruleId: null,
    })
  })

  it('returns null for overdue when inline frequency is missing', async () => {
    const result = await resolveReminderAlertConfig(
      buildReminder({ useOrgAlertDefaults: false, overdueAlertFrequency: null }),
      'overdue'
    )

    expect(result).toBeNull()
  })

  it('returns null for upcoming when inline daysBefore is empty', async () => {
    const result = await resolveReminderAlertConfig(
      buildReminder({ useOrgAlertDefaults: false, daysBefore: [] }),
      'upcoming'
    )

    expect(result).toBeNull()
  })
})
