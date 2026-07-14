export type TransferTitleParts = {
  fromOrgName?: string | null
  toOrgName?: string | null
  fromAccountName?: string | null
  toAccountName?: string | null
  isCrossOrg: boolean
}

export function buildTransferTitle(parts: TransferTitleParts): string {
  const fromAccount = parts.fromAccountName?.trim() || 'Origem'
  const toAccount = parts.toAccountName?.trim() || 'Destino'

  if (parts.isCrossOrg) {
    const fromOrg = parts.fromOrgName?.trim() || 'Org origem'
    const toOrg = parts.toOrgName?.trim() || 'Org destino'
    return `Transferência: ${fromOrg}/${fromAccount} → ${toOrg}/${toAccount}`
  }

  return `Transferência: ${fromAccount} → ${toAccount}`
}

export function isAutoTransferTitle(title: string): boolean {
  return title.trim().startsWith('Transferência:')
}
