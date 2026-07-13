export function shouldSkipAlertDedupe(skipDedupe?: boolean): boolean {
  return Boolean(skipDedupe)
}

/** When skipping, uniquify so `notifications.dedupe_key` unique index does not block insert. */
export function resolveAlertDedupeKey(baseKey: string, skipDedupe?: boolean): string {
  if (!shouldSkipAlertDedupe(skipDedupe)) return baseKey
  return `${baseKey}:run-${Date.now()}`
}
