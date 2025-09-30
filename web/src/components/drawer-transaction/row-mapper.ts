import type {
  GetOrgSlugReportsTransactions200ReportsOverdueTransactionsTransactionsItem,
  GetOrgSlugReportsTransactions200ReportsPaidThisMonthTransactionsItem,
  GetOrgSlugReportsTransactions200ReportsUpcomingAlertsTransactionsItem,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'

// Mapeia item de Alertas Próximos (schema do endpoint) para o item de lista usado no Drawer
export function mapUpcomingAlertToListItem(
  t: GetOrgSlugReportsTransactions200ReportsUpcomingAlertsTransactionsItem
): ListTransactions200TransactionsItem {
  return {
    id: t.id,
    serieId: (t as any).seriesId || t.id,
    type: 'expense',
    title: t.title,
    payTo: (t as any).payTo || (t as any).payToEmail || '',
    ownerId: (t as any).ownerId || '',
    payToId: (t as any).payToId || '',
    ownerName: t.ownerName,
    amount: String(t.amount),
    dueDate: t.dueDate,
    paidAt: null,
    status: 'pending',
    overdueDays: 0,
    tags: [],
    installmentsTotal: (t as any).installmentsTotal ?? null,
    installmentsPaid: null,
    description: null,
    contextualizedType: 'expense',
  }
}

// Mapeia item de Transações Vencidas
export function mapOverdueToListItem(
  t: GetOrgSlugReportsTransactions200ReportsOverdueTransactionsTransactionsItem
): ListTransactions200TransactionsItem {
  return {
    id: t.id,
    serieId: (t as any).seriesId || (t as any).serieId || t.id,
    type: 'expense',
    title: t.title,
    payTo: (t as any).payTo || (t as any).payToEmail || '',
    ownerId: (t as any).ownerId || '',
    payToId: (t as any).payToId || '',
    ownerName: t.ownerName,
    amount: String(t.amount),
    dueDate: t.dueDate,
    paidAt: null,
    status: 'pending',
    overdueDays: (t as any).overdueDays ?? 0,
    tags: [],
    installmentsTotal: null,
    installmentsPaid: null,
    description: null,
    contextualizedType: 'expense',
  }
}

// Mapeia item de Pagas neste mês
export function mapPaidThisMonthToListItem(
  t: GetOrgSlugReportsTransactions200ReportsPaidThisMonthTransactionsItem
): ListTransactions200TransactionsItem {
  return {
    id: t.id,
    serieId: (t as any).seriesId || (t as any).serieId || t.id,
    type: 'expense',
    title: t.title,
    payTo: (t as any).payTo || (t as any).payToEmail || '',
    ownerId: (t as any).ownerId || '',
    payToId: (t as any).payToId || '',
    ownerName: t.ownerName,
    amount: String(t.amount),
    dueDate: t.dueDate,
    paidAt: (t as any).paidAt ?? null,
    status: 'paid',
    overdueDays: 0,
    tags: [],
    installmentsTotal: null,
    installmentsPaid: null,
    description: null,
    contextualizedType: 'expense',
  }
}

// Serializa dados da transação para o drawer com cálculos derivados
export interface SerializedTransactionData {
  // Dados originais
  transaction: ListTransactions200TransactionsItem | null

  // Cálculos derivados
  isEditMode: boolean
  isOwner: boolean
  isPaid: boolean
  isReadOnly: boolean

  // Títulos e descrições
  title: string
  description: string
}

export function serializeTransactionForDrawer(
  transaction: ListTransactions200TransactionsItem | null,
  currentUserId?: string
): SerializedTransactionData {
  const isEditMode = !!transaction
  const isOwner = transaction?.ownerId === currentUserId
  const isPaid = transaction?.status === 'paid'
  const isReadOnly = isEditMode && !(isOwner && !isPaid)

  // Títulos e descrições baseados no estado
  let title: string
  let description: string

  if (isEditMode) {
    if (isPaid) {
      title = 'Transação paga'
      description = 'Transações pagas não podem ser editadas, mas o status pode ser alterado.'
    } else {
      title = isReadOnly ? 'Visualizar transação' : 'Editar transação'
      description = transaction?.title || ''
    }
  } else {
    title = 'Criar nova Despesa' // Será atualizado dinamicamente baseado no tipo do form
    description = 'Crie um nova despesa e defina os detalhes.'
  }

  return {
    transaction,
    isEditMode,
    isOwner,
    isPaid,
    isReadOnly,
    title,
    description,
  }
}
