import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { SYSTEM_SETTINGS_ID, systemSettings } from '@/db/schemas/systemSettings'

export type SystemNotificationSettings = {
  notificationsEnabled: boolean
  updatedAt: Date
}

const CACHE_TTL_MS = 5_000

let cache: { value: boolean; expiresAt: number } | null = null

function invalidateCache() {
  cache = null
}

async function ensureRow(): Promise<SystemNotificationSettings> {
  const [existing] = await db
    .select({
      notificationsEnabled: systemSettings.notificationsEnabled,
      updatedAt: systemSettings.updatedAt,
    })
    .from(systemSettings)
    .where(eq(systemSettings.id, SYSTEM_SETTINGS_ID))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(systemSettings)
    .values({
      id: SYSTEM_SETTINGS_ID,
      notificationsEnabled: true,
    })
    .onConflictDoNothing()
    .returning({
      notificationsEnabled: systemSettings.notificationsEnabled,
      updatedAt: systemSettings.updatedAt,
    })

  if (created) return created

  const [fallback] = await db
    .select({
      notificationsEnabled: systemSettings.notificationsEnabled,
      updatedAt: systemSettings.updatedAt,
    })
    .from(systemSettings)
    .where(eq(systemSettings.id, SYSTEM_SETTINGS_ID))
    .limit(1)

  return fallback ?? { notificationsEnabled: true, updatedAt: new Date() }
}

/** Platform-wide gate: when false, no alert/notification should be created or delivered. */
export async function areSystemNotificationsEnabled(): Promise<boolean> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) {
    return cache.value
  }

  const settings = await ensureRow()
  cache = { value: settings.notificationsEnabled, expiresAt: now + CACHE_TTL_MS }
  return settings.notificationsEnabled
}

export async function getSystemNotificationSettings(): Promise<SystemNotificationSettings> {
  return ensureRow()
}

export async function setSystemNotificationsEnabled(
  enabled: boolean
): Promise<SystemNotificationSettings> {
  await ensureRow()

  const [updated] = await db
    .update(systemSettings)
    .set({
      notificationsEnabled: enabled,
      updatedAt: new Date(),
    })
    .where(eq(systemSettings.id, SYSTEM_SETTINGS_ID))
    .returning({
      notificationsEnabled: systemSettings.notificationsEnabled,
      updatedAt: systemSettings.updatedAt,
    })

  invalidateCache()

  return updated ?? { notificationsEnabled: enabled, updatedAt: new Date() }
}

/** Test helper — clears the in-memory gate cache. */
export function clearSystemNotificationsCacheForTests() {
  invalidateCache()
}
