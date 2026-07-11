import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.DB_PASSWORD = 'test'
  process.env.JWT_SECRET = 'test-secret'
  process.env.WEB_URL = 'http://localhost:3000'
})

import { resolveEffectiveOverdueNotify } from '@/modules/alerts/resolve-effective-overdue-notify'
import { resolveNotifyTarget } from '@/modules/transactions/notify-target'
import { validateNotifyOverdueConfig } from '@/modules/transactions/notify-overdue-config'

describe('validateNotifyOverdueConfig', () => {
  it('accepts null as organization default', () => {
    expect(validateNotifyOverdueConfig(null)).toBeNull()
  })

  it('accepts disabled override', () => {
    expect(validateNotifyOverdueConfig({ disabled: true })).toEqual({ disabled: true })
  })

  it('accepts custom frequency and interval', () => {
    expect(
      validateNotifyOverdueConfig({ frequency: 'weekly', interval: 2 })
    ).toEqual({ frequency: 'weekly', interval: 2 })
  })
})

describe('resolveNotifyTarget', () => {
  it('clears overdue config when notify is disabled', () => {
    expect(
      resolveNotifyTarget(
        { notifyEnabled: false },
        {
          notifyEnabled: true,
          notifyTargetType: 'member',
          notifyUserId: 'user-1',
          notifyContactName: null,
          notifyContactPhone: null,
          notifyDaysBefore: [1, 3],
          notifyOverdueConfig: { frequency: 'daily', interval: 1 },
        }
      )
    ).toEqual({
      notifyEnabled: false,
      notifyTargetType: null,
      notifyUserId: null,
      notifyContactName: null,
      notifyContactPhone: null,
      notifyDaysBefore: null,
      notifyOverdueConfig: null,
    })
  })

  it('persists custom overdue config when notify is enabled', () => {
    expect(
      resolveNotifyTarget({
        notifyEnabled: true,
        notifyTargetType: 'member',
        notifyUserId: 'user-1',
        notifyDaysBefore: null,
        notifyOverdueConfig: { frequency: 'monthly', interval: 3 },
      })
    ).toMatchObject({
      notifyEnabled: true,
      notifyDaysBefore: null,
      notifyOverdueConfig: { frequency: 'monthly', interval: 3 },
    })
  })

  it('persists disabled overdue override', () => {
    expect(
      resolveNotifyTarget({
        notifyEnabled: true,
        notifyTargetType: 'member',
        notifyUserId: 'user-1',
        notifyOverdueConfig: { disabled: true },
      })
    ).toMatchObject({
      notifyOverdueConfig: { disabled: true },
    })
  })
})

describe('resolveEffectiveOverdueNotify', () => {
  const orgRule = {
    id: 'rule-1',
    config: { frequency: 'daily' as const, interval: 1 },
    channels: ['in_app', 'whatsapp'] as const,
  }

  it('returns null when disabled on transaction', () => {
    expect(
      resolveEffectiveOverdueNotify({
        txOverride: { disabled: true },
        orgRuleConfig: orgRule.config,
        orgRuleId: orgRule.id,
        orgRuleChannels: [...orgRule.channels],
      })
    ).toBeNull()
  })

  it('uses transaction custom config over organization rule', () => {
    expect(
      resolveEffectiveOverdueNotify({
        txOverride: { frequency: 'weekly', interval: 2 },
        orgRuleConfig: orgRule.config,
        orgRuleId: orgRule.id,
        orgRuleChannels: [...orgRule.channels],
      })
    ).toEqual({
      config: { frequency: 'weekly', interval: 2 },
      channels: ['in_app', 'whatsapp'],
      ruleId: 'rule-1',
    })
  })

  it('falls back to organization rule when override is null', () => {
    expect(
      resolveEffectiveOverdueNotify({
        txOverride: null,
        orgRuleConfig: orgRule.config,
        orgRuleId: orgRule.id,
        orgRuleChannels: [...orgRule.channels],
      })
    ).toEqual({
      config: { frequency: 'daily', interval: 1 },
      channels: ['in_app', 'whatsapp'],
      ruleId: 'rule-1',
    })
  })

  it('uses custom config with default channels when organization has no overdue rule', () => {
    expect(
      resolveEffectiveOverdueNotify({
        txOverride: { frequency: 'monthly', interval: 1 },
        orgRuleConfig: null,
        orgRuleId: null,
      })
    ).toEqual({
      config: { frequency: 'monthly', interval: 1 },
      channels: ['in_app', 'whatsapp', 'extension'],
      ruleId: 'tx-overdue-override',
    })
  })
})
