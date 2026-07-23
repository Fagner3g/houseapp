export type InstallmentDateScope = 'current' | 'from_here' | 'all'

export function shouldAskInstallmentDateScope(options: {
  isCreditCardAccount: boolean
  installmentsTotal: number | null | undefined
  originalDateKey: string
  nextDateKey: string
}): boolean {
  if (options.isCreditCardAccount) return false
  if ((options.installmentsTotal ?? 0) < 2) return false
  return options.originalDateKey !== options.nextDateKey
}
