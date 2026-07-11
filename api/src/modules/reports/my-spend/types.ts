export type MySpendItemKind = 'invoice' | 'expense'

export type MySpendItemRow = {
  kind: MySpendItemKind
  id: string
  title: string
  subtitle: string | null
  date: Date
  accountId: string | null
  monthKey: string | null
  grossAmount: bigint
  splitAmount: bigint
  myAmount: bigint
}

export type MySpendBreakdown = {
  items: MySpendItemRow[]
  grossTotal: bigint
  splitTotal: bigint
  myTotal: bigint
}
