export function resolveOccurrenceDescription(
  explicit: string | undefined,
  existing: { description: string | null }[]
): string | undefined {
  if (explicit !== undefined) return explicit

  for (let i = existing.length - 1; i >= 0; i--) {
    const value = existing[i].description?.trim()
    if (value) return value
  }

  return undefined
}
