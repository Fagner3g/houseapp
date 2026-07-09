export function normalizePhoneDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '')
}

export function formatPhoneInput(value: string): string {
  const digits = normalizePhoneDigits(value).slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function isValidPhoneDigits(value: string | null | undefined): boolean {
  const digits = normalizePhoneDigits(value)
  return digits.length === 10 || digits.length === 11
}
