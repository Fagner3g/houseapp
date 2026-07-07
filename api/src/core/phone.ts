export function normalizePhoneDigits(raw: string | null | undefined): string {
  return String(raw ?? '').replace(/\D/g, '')
}

export function phoneLookupVariants(digits: string): string[] {
  const normalized = normalizePhoneDigits(digits)
  if (!normalized) return []

  const variants = new Set<string>([normalized])

  if (normalized.startsWith('55') && normalized.length > 11) {
    variants.add(normalized.slice(2))
  }

  if (normalized.length >= 10 && normalized.length <= 11) {
    variants.add(`55${normalized}`)
  }

  return [...variants]
}

export function phonesMatch(
  stored: string | null | undefined,
  input: string | null | undefined
): boolean {
  const storedDigits = normalizePhoneDigits(stored)
  const inputDigits = normalizePhoneDigits(input)

  if (!storedDigits || !inputDigits) return false

  return phoneLookupVariants(inputDigits).includes(storedDigits)
}
