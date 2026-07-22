import { beforeEach, describe, expect, it, vi } from 'vitest'

const selectLimit = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: (...args: unknown[]) => selectLimit(...args),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => [],
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ notificationsEnabled: false, updatedAt: new Date() }],
        }),
      }),
    }),
  },
}))

import {
  areSystemNotificationsEnabled,
  clearSystemNotificationsCacheForTests,
  setSystemNotificationsEnabled,
} from './notifications-enabled'

describe('areSystemNotificationsEnabled', () => {
  beforeEach(() => {
    clearSystemNotificationsCacheForTests()
    selectLimit.mockReset()
  })

  it('returns true when the row is enabled', async () => {
    selectLimit.mockResolvedValueOnce([{ notificationsEnabled: true, updatedAt: new Date() }])

    await expect(areSystemNotificationsEnabled()).resolves.toBe(true)
  })

  it('returns false when the row is disabled', async () => {
    selectLimit.mockResolvedValueOnce([{ notificationsEnabled: false, updatedAt: new Date() }])

    await expect(areSystemNotificationsEnabled()).resolves.toBe(false)
  })

  it('caches the value within the TTL', async () => {
    selectLimit.mockResolvedValueOnce([{ notificationsEnabled: false, updatedAt: new Date() }])

    await expect(areSystemNotificationsEnabled()).resolves.toBe(false)
    await expect(areSystemNotificationsEnabled()).resolves.toBe(false)
    expect(selectLimit).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache after setSystemNotificationsEnabled', async () => {
    selectLimit
      .mockResolvedValueOnce([{ notificationsEnabled: true, updatedAt: new Date() }])
      .mockResolvedValueOnce([{ notificationsEnabled: true, updatedAt: new Date() }])
      .mockResolvedValueOnce([{ notificationsEnabled: false, updatedAt: new Date() }])

    await expect(areSystemNotificationsEnabled()).resolves.toBe(true)
    await setSystemNotificationsEnabled(false)
    await expect(areSystemNotificationsEnabled()).resolves.toBe(false)
    expect(selectLimit).toHaveBeenCalledTimes(3)
  })
})
