import { create } from 'zustand'

import type { CreateAccountBodyType, CreateTransactionBody } from '@/api/generated/model'

type TransactionDraft = Partial<CreateTransactionBody>

export type TransactionDrawerOptions = {
  lockAccountId?: string
}

export type PayInvoiceContext = {
  creditCardAccountId: string
  creditCardName: string
  cycleLabel: string
  dueDate: string
  amountCents: number
}

export type AnalyticsGroupContext = {
  accountId: string
  accountName: string
  cycleLabel: string
  purchasesLabel: string
  purchasesPeriod: {
    start: string
    end: string
  }
  /** Matched invoice statement id, or null when there is no imported statement. */
  statementId: string | null
  groupType: 'category' | 'merchant'
  groupKey: string
  label: string
  total: string
  occurrenceCount?: number
  color?: string | null
}

export type TransactionDrawerMode = 'create' | 'edit' | 'pay'

export type CategoryDrawerMode = 'create' | 'edit'

export type AccountDrawerMode = 'create' | 'edit'

export type EditingCategory = {
  id: string
  name: string
  type: 'income' | 'expense'
}

interface DrawerStore {
  aiChatOpen: boolean
  inlineCreateFocusToken: number
  transactionDrawerOpen: boolean
  transactionDrawerMode: TransactionDrawerMode
  accountDrawerOpen: boolean
  accountDrawerMode: AccountDrawerMode
  accountDrawerDefaultType: CreateAccountBodyType | null
  accountDrawerDefaultInstitution: string | null
  editingAccountId: string | null
  categoryDrawerOpen: boolean
  categoryDrawerMode: CategoryDrawerMode
  categoryDrawerDefaultType: 'income' | 'expense' | null
  editingCategory: EditingCategory | null
  cardDrawerOpen: boolean
  cardDrawerAccountId: string | null
  payInvoiceDrawerOpen: boolean
  payInvoiceContext: PayInvoiceContext | null
  analyticsGroupDrawerOpen: boolean
  analyticsGroupContext: AnalyticsGroupContext | null
  recurringContractDrawerOpen: boolean
  editingRecurringId: string | null
  transactionDraft: TransactionDraft | null
  lockedAccountId: string | null
  editingTransactionId: string | null
  accountDrawerCallback: ((accountId: string) => void) | null
  categoryDrawerCallback: ((categoryId: string) => void) | null
  openAiChat: () => void
  closeAiChat: () => void
  requestInlineCreateFocus: () => void
  openTransactionDrawer: (
    draft?: TransactionDraft,
    editingId?: string | null,
    options?: TransactionDrawerOptions
  ) => void
  openTransactionPayDrawer: (transactionId: string) => void
  closeTransactionDrawer: () => void
  openAccountDrawer: (
    callback?: (accountId: string) => void,
    defaultType?: CreateAccountBodyType,
    defaultInstitution?: string | null
  ) => void
  openEditAccountDrawer: (accountId: string, callback?: (accountId: string) => void) => void
  closeAccountDrawer: () => void
  openCategoryDrawer: (
    callback?: (categoryId: string) => void,
    defaultType?: 'income' | 'expense'
  ) => void
  openEditCategoryDrawer: (
    category: EditingCategory,
    callback?: (categoryId: string) => void
  ) => void
  closeCategoryDrawer: () => void
  openCardDrawer: (accountId: string) => void
  closeCardDrawer: () => void
  openPayInvoiceDrawer: (context: PayInvoiceContext) => void
  closePayInvoiceDrawer: () => void
  openAnalyticsGroupDrawer: (context: AnalyticsGroupContext) => void
  closeAnalyticsGroupDrawer: () => void
  openRecurringContractDrawer: (recurringId: string) => void
  closeRecurringContractDrawer: () => void
  closeNestedDrawers: () => void
}

export const selectNestedDrawerOpen = (s: {
  accountDrawerOpen: boolean
  categoryDrawerOpen: boolean
  cardDrawerOpen: boolean
  recurringContractDrawerOpen: boolean
}) =>
  s.accountDrawerOpen ||
  s.categoryDrawerOpen ||
  s.cardDrawerOpen ||
  s.recurringContractDrawerOpen

export const useDrawerStore = create<DrawerStore>(set => ({
  aiChatOpen: false,
  inlineCreateFocusToken: 0,
  transactionDrawerOpen: false,
  transactionDrawerMode: 'create',
  accountDrawerOpen: false,
  accountDrawerMode: 'create',
  accountDrawerDefaultType: null,
  accountDrawerDefaultInstitution: null,
  editingAccountId: null,
  categoryDrawerOpen: false,
  categoryDrawerMode: 'create',
  categoryDrawerDefaultType: null,
  editingCategory: null,
  cardDrawerOpen: false,
  cardDrawerAccountId: null,
  payInvoiceDrawerOpen: false,
  payInvoiceContext: null,
  analyticsGroupDrawerOpen: false,
  analyticsGroupContext: null,
  recurringContractDrawerOpen: false,
  editingRecurringId: null,
  transactionDraft: null,
  lockedAccountId: null,
  editingTransactionId: null,
  accountDrawerCallback: null,
  categoryDrawerCallback: null,
  openAiChat: () => set({ aiChatOpen: true }),
  closeAiChat: () => set({ aiChatOpen: false }),
  requestInlineCreateFocus: () =>
    set(state => ({ inlineCreateFocusToken: state.inlineCreateFocusToken + 1 })),
  openTransactionDrawer: (draft, editingId = null, options) =>
    set({
      transactionDrawerOpen: true,
      transactionDrawerMode: editingId ? 'edit' : 'create',
      transactionDraft: draft ?? null,
      lockedAccountId: options?.lockAccountId ?? null,
      editingTransactionId: editingId,
    }),
  openTransactionPayDrawer: transactionId =>
    set({
      transactionDrawerOpen: true,
      transactionDrawerMode: 'pay',
      transactionDraft: null,
      lockedAccountId: null,
      editingTransactionId: transactionId,
    }),
  closeTransactionDrawer: () =>
    set({
      transactionDrawerOpen: false,
      transactionDrawerMode: 'create',
      transactionDraft: null,
      lockedAccountId: null,
      editingTransactionId: null,
      accountDrawerOpen: false,
      accountDrawerMode: 'create',
      editingAccountId: null,
      categoryDrawerOpen: false,
      categoryDrawerMode: 'create',
      categoryDrawerDefaultType: null,
      editingCategory: null,
      cardDrawerOpen: false,
      accountDrawerCallback: null,
      accountDrawerDefaultType: null,
      accountDrawerDefaultInstitution: null,
      categoryDrawerCallback: null,
      cardDrawerAccountId: null,
      payInvoiceDrawerOpen: false,
      payInvoiceContext: null,
      recurringContractDrawerOpen: false,
      editingRecurringId: null,
    }),
  openAccountDrawer: (callback, defaultType, defaultInstitution) =>
    set({
      accountDrawerOpen: true,
      accountDrawerMode: 'create',
      accountDrawerCallback: callback ?? null,
      accountDrawerDefaultType: defaultType ?? null,
      accountDrawerDefaultInstitution: defaultInstitution ?? null,
      editingAccountId: null,
    }),
  openEditAccountDrawer: (accountId, callback) =>
    set({
      accountDrawerOpen: true,
      accountDrawerMode: 'edit',
      accountDrawerCallback: callback ?? null,
      accountDrawerDefaultType: null,
      accountDrawerDefaultInstitution: null,
      editingAccountId: accountId,
    }),
  closeAccountDrawer: () =>
    set({
      accountDrawerOpen: false,
      accountDrawerMode: 'create',
      accountDrawerCallback: null,
      accountDrawerDefaultType: null,
      accountDrawerDefaultInstitution: null,
      editingAccountId: null,
    }),
  openCategoryDrawer: (callback, defaultType) =>
    set({
      categoryDrawerOpen: true,
      categoryDrawerMode: 'create',
      categoryDrawerCallback: callback ?? null,
      categoryDrawerDefaultType: defaultType ?? null,
      editingCategory: null,
    }),
  openEditCategoryDrawer: (category, callback) =>
    set({
      categoryDrawerOpen: true,
      categoryDrawerMode: 'edit',
      editingCategory: category,
      categoryDrawerCallback: callback ?? null,
      categoryDrawerDefaultType: null,
    }),
  closeCategoryDrawer: () =>
    set({
      categoryDrawerOpen: false,
      categoryDrawerMode: 'create',
      categoryDrawerCallback: null,
      categoryDrawerDefaultType: null,
      editingCategory: null,
    }),
  openCardDrawer: accountId => set({ cardDrawerOpen: true, cardDrawerAccountId: accountId }),
  closeCardDrawer: () => set({ cardDrawerOpen: false, cardDrawerAccountId: null }),
  openPayInvoiceDrawer: context =>
    set({ payInvoiceDrawerOpen: true, payInvoiceContext: context }),
  closePayInvoiceDrawer: () =>
    set({ payInvoiceDrawerOpen: false, payInvoiceContext: null }),
  openAnalyticsGroupDrawer: context =>
    set({ analyticsGroupDrawerOpen: true, analyticsGroupContext: context }),
  closeAnalyticsGroupDrawer: () =>
    set({ analyticsGroupDrawerOpen: false, analyticsGroupContext: null }),
  openRecurringContractDrawer: recurringId =>
    set({ recurringContractDrawerOpen: true, editingRecurringId: recurringId }),
  closeRecurringContractDrawer: () =>
    set({ recurringContractDrawerOpen: false, editingRecurringId: null }),
  closeNestedDrawers: () =>
    set({
      accountDrawerOpen: false,
      accountDrawerMode: 'create',
      editingAccountId: null,
      categoryDrawerOpen: false,
      categoryDrawerMode: 'create',
      categoryDrawerDefaultType: null,
      editingCategory: null,
      cardDrawerOpen: false,
      accountDrawerCallback: null,
      accountDrawerDefaultType: null,
      accountDrawerDefaultInstitution: null,
      categoryDrawerCallback: null,
      cardDrawerAccountId: null,
      payInvoiceDrawerOpen: false,
      payInvoiceContext: null,
      analyticsGroupDrawerOpen: false,
      analyticsGroupContext: null,
      recurringContractDrawerOpen: false,
      editingRecurringId: null,
    }),
}))
