type AccountNameRef = {
  name: string
  isActive?: boolean | null
}

const INSTITUTION_LABELS: Record<string, string> = {
  nubank: 'Nubank',
  itau: 'Itaú',
  bradesco: 'Bradesco',
  santander: 'Santander',
  bb: 'Banco do Brasil',
  caixa: 'Caixa',
  inter: 'Inter',
  c6: 'C6 Bank',
  xp: 'XP',
}

function institutionLabel(institution: string): string {
  return INSTITUTION_LABELS[institution] ?? institution
}

export function suggestCreditCardAccountName(
  baseName: string,
  institution: string,
  accounts: AccountNameRef[]
): string {
  const takenNames = new Set(
    accounts
      .map(account => account.name.trim().toLowerCase())
      .filter(Boolean)
  )

  const label = institutionLabel(institution)
  const candidates = [baseName, `${label} Cartão`, `${baseName} Cartão`, `${label} Fatura`]

  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    if (trimmed && !takenNames.has(trimmed.toLowerCase())) {
      return trimmed
    }
  }

  let suffix = 2
  while (takenNames.has(`${baseName} ${suffix}`.toLowerCase())) {
    suffix += 1
  }

  return `${baseName} ${suffix}`
}
