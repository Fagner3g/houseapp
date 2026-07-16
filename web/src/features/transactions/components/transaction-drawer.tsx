import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { ChevronDown, Download, ExternalLink, FileText, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { z } from 'zod'

import { calendarDateToIso, isoToCalendarDate } from '@/lib/date'
import {
  getGetSplitDebtSummaryQueryKey,
  getGetTransactionQueryKey,
  getListSplitsQueryKey,
  useCancelTransactionPayment,
  useCreateRecurringTransaction,
  useCreateSplit,
  useCreateTransaction,
  useGetInstallmentSeries,
  useGetSplitDebtSummary,
  useGetTransaction,
  useListAccounts,
  useListAlertRules,
  useListAttachments,
  useListCards,
  useListSplits,
  useListUsersByOrg,
  usePayTransaction,
  useRegisterSplitPayment,
  useUpdateTransaction,
} from '@/api/generated/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePickerInput } from '@/components/ui/date-picker-field'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Form,
  FormControl,
  FormErrorBanner,
  FormField,
  FormItem,
  FormLabel,
  FormRequiredMark,
  buildRequiredFieldsMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import {
  downloadTransactionAttachment,
  uploadTransactionAttachment,
} from '@/lib/attachments'
import {
  apiAmountToFormReais,
  formatCentsString,
  formatCurrency,
  moneyStringToReais,
  optionalReaisToApiAmount,
  reaisToCentsString,
  reaisToMoneyString,
} from '@/lib/currency'
import { readHttpErrorMessage } from '@/lib/http'
import {
  formatInvoiceLabel,
  resolveBillingCycleForPurchaseDate,
} from '@/lib/billing-cycle'
import {
  isOnCanonicalInvoiceView,
  resolveInvoicePaymentTarget,
} from '@/lib/invoice-payment'
import { selectNestedDrawerOpen, useDrawerStore } from '@/stores/drawers'
import { cn } from '@/lib/utils'
import {
  stackyDrawerContent,
  stackyDrawerOverlay,
  stackyDrawerOverlayNested,
  stackyDrawerOverlaySuppressed,
  stackyDrawerLabelRow,
  stackyDrawerFormLabelSlot,
  stackyDrawerAddButton,
  stackyDrawerFooter,
  stackyDrawerHeader,
  stackyDrawerTitle,
  stackyDrawerCloseButton,
  stackyDrawerForm,
  stackyDrawerFormRow,
  stackyDrawerFormItem,
  stackyDrawerPanelMuted,
  stackyRecurrencePanel,
  stackyRecurrenceSegmentedControl,
  stackyRecurrenceSegmentItem,
  stackySelectTrigger,
  stackySelectItem,
  stackyFilePickerButton,
  stackyTypeSegmentedControl,
  stackyTypeSegmentItem,
  stackyPrimaryButton,
  stackySecondaryButton,
  stackySegmentedControl,
  stackySegmentItem,
  stackySegmentItemExpense,
  stackySegmentItemIncome,
  stackySegmentItemTransfer,
} from '@/lib/ui-classes'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getSplitTransactionIdsQueryKey } from '@/features/credit-cards/hooks/use-split-transaction-ids'
import { buildSplitCreateBody } from '@/features/accounts/components/import-review-types'
import {
  defaultSplitDraftState,
  TransactionSplitsDraftSection,
  validateSplitDraft,
  type SplitDraftState,
} from './transaction-splits-draft-section'
import { TransactionFooterSummary } from './transaction-footer-summary'
import { TransactionSplitsSection } from './transaction-splits-section'
import { DeleteTransactionDialog } from './delete-transaction-dialog'
import { canDeleteTransaction } from '@/features/transactions/utils/can-delete-transaction'
import { invalidateTransactionQueries } from '@/features/transactions/lib/invalidate-transaction-queries'
import { isImportedStatementTransaction } from '@/features/transactions/utils/is-imported-statement-transaction'
import {
  buildNotifyApiPayload,
  defaultNotifyState,
  notifyStateFromTransaction,
  orgNotifyDefaultsFromRules,
  TransactionRemindersSection,
  type OrgNotifyDefaults,
  type TransactionNotifyState,
} from './transaction-reminders-section'
import { TransactionSchedulePaymentSection } from './transaction-schedule-payment-section'
import { AccountDrawer } from '@/features/accounts/components/account-drawer'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { filterPaymentAccounts } from '@/features/accounts/constants'
import { CardDrawer } from '@/features/accounts/components/card-drawer'
import { CategoryDrawer } from '@/features/categories/components/category-drawer'
import { RecurringContractDrawer } from '@/features/recurring/components/recurring-contract-drawer'
import { CategorySelect } from '@/features/categories/components/category-select'
import {
  isTransactionReminderWithoutValue,
  resolveSettlementPrefillReais,
  resolveTransactionInstallmentAmountReais,
  resolveTransactionInstallmentRemainingReais,
} from '@/features/transactions/installment-amount.utils'
import {
  parseTransactionPeriodicity,
  RECURRING_DURATION_OPTIONS,
  TRANSACTION_PERIODICITY_OPTIONS,
} from '../constants'
import { InstallmentPreviewPanel } from './installment-preview-panel'
import {
  AdvanceInstallmentsPicker,
  canOfferInstallmentAdvance,
  computeAdvancePaymentTotalReais,
  listFutureUnpaidInstallments,
} from './advance-installments-picker'
import {
  PayInstallmentScopeDialog,
  type PayInstallmentScopeResult,
} from './pay-installment-scope-dialog'
import { EditInstallmentDateScopeDialog } from './edit-installment-date-scope-dialog'
import {
  shouldAskInstallmentDateScope,
  type InstallmentDateScope,
} from '../lib/installment-date-scope'
import { buildInstallmentPreview } from '../installment-preview'
import {
  buildUnsettledSplitItems,
  type UnsettledSplitItem,
} from '../split-debt-summary.utils'
import { useCreateTransfer } from '../api/create-transfer'
import { TransferDestinationFields } from './transfer/transfer-destination-fields'
import { SplitPaymentPayBanner } from './split-payment-pay-banner'
import {
  alreadySettledFragment,
  amountToSettleAccountLabel,
  amountToSettleLabel,
  cancelSettlementLabel,
  installmentSettlementHint,
  installmentSettlementScopeNote,
  payInstallmentScopeConfirmLabel,
  registerSettlementButtonLabel,
  settledAmountLabel,
  settledToggleLabel,
  settlementDateLabel,
  settlementKindFromType,
} from '../lib/settlement-copy'
import { underpaymentCarryHint } from '../lib/settlement-advance-copy'
import { runUnifiedSettlement } from '../lib/unified-settlement'
import {
  amountFieldValidationLabel,
  amountMustMatchSelectionToast,
  advancePromptDescription,
  advancePromptTitle,
  dateFieldValidationLabel,
  enterAmountToast,
  installmentConfirmedToast,
  settlementRegisteredToast,
  underpaymentCarryToast,
} from '../lib/settlement-toasts'

function hasPositiveAmount(amount: number | null | undefined): boolean {
  return amount != null && Number.isFinite(amount) && amount > 0
}

const EMPTY_UNSETTLED_SPLITS: UnsettledSplitItem[] = []

function createTransactionSchema(options: { requireCategory: boolean }) {
  return z
    .object({
      type: z.enum(['expense', 'income', 'transfer']),
      title: z.string(),
      amount: z.number().nullable(),
      date: z.string().min(1),
      competenceDate: z.string().optional(),
      accountId: z.string().optional(),
      transferToOrganizationSlug: z.string().optional(),
      transferToAccountId: z.string().optional(),
      cardId: z.string().optional(),
      categoryId: z.string().optional(),
      status: z.enum(['pending', 'paid']),
      description: z.string().optional(),
      counterparty: z.string().optional(),
      recurrence: z.enum(['once', 'installment', 'recurring']),
      periodicity: z
        .enum([
          'weekly-1',
          'weekly-2',
          'monthly-1',
          'monthly-2',
          'monthly-3',
          'monthly-6',
          'yearly-1',
        ])
        .default('monthly-1'),
      installmentsTotal: z.coerce.number().int().min(2).optional(),
      recurringDuration: z.enum(['infinite', 'times', 'until']).default('times'),
      recurringRepetitions: z.coerce.number().int().min(1).optional(),
      recurringEndDate: z.string().optional(),
      paidAt: z.string().optional(),
      paidAmount: z.number().optional(),
    })
    .superRefine((values, ctx) => {
      const amountRequired =
        values.type === 'transfer' ||
        values.recurrence === 'installment' ||
        values.status === 'paid'

      if (amountRequired && !hasPositiveAmount(values.amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Valor obrigatório',
          path: ['amount'],
        })
      }

      if (values.type !== 'transfer' && !values.title.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Descrição obrigatória',
          path: ['title'],
        })
      }

      if (values.type === 'transfer') {
        if (!values.accountId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Selecione a conta de origem',
            path: ['accountId'],
          })
        }
        if (!values.transferToAccountId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Selecione a conta de destino',
            path: ['transferToAccountId'],
          })
        }
        return
      }

      if (options.requireCategory && !values.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione uma categoria',
          path: ['categoryId'],
        })
      }
      if (!values.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione uma conta',
          path: ['accountId'],
        })
      }

      if (values.recurrence === 'recurring') {
        if (values.recurringDuration === 'times' && !values.recurringRepetitions) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe o número de repetições',
            path: ['recurringRepetitions'],
          })
        }
        if (values.recurringDuration === 'until' && !values.recurringEndDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe a data final',
            path: ['recurringEndDate'],
          })
        }
      }
    })
}

const transactionSchema = createTransactionSchema({ requireCategory: true })
const editTransactionSchema = createTransactionSchema({ requireCategory: false })

type TransactionFormValues = z.infer<typeof transactionSchema>

const payTransactionSchema = z.object({
  paidAmount: z.number().positive('Valor obrigatório'),
  paidAt: z.string().min(1, 'Data obrigatória'),
})

function isTransactionPartial(status: string | undefined): boolean {
  return status === 'partial'
}

function resolveTransactionDisplayStatus(
  txStatus: string | undefined,
  formStatus: 'pending' | 'paid'
): 'paid' | 'partial' | 'pending' {
  if (txStatus === 'paid') return 'paid'
  if (isTransactionPartial(txStatus)) return 'partial'
  if (txStatus === 'canceled') return 'pending'
  return formStatus
}

function defaultFormValues(orgSlug?: string): TransactionFormValues {
  return {
    type: 'expense',
    title: '',
    amount: null,
    date: dayjs().format('YYYY-MM-DD'),
    status: 'pending',
    recurrence: 'once',
    periodicity: 'monthly-1',
    installmentsTotal: 2,
    recurringDuration: 'times',
    recurringRepetitions: 2,
    recurringEndDate: dayjs().format('YYYY-MM-DD'),
    counterparty: '',
    paidAt: dayjs().format('YYYY-MM-DD'),
    paidAmount: 0,
    transferToOrganizationSlug: orgSlug,
  }
}

type AccountOption = {
  id: string
  type: string
  name: string
  cards?: Array<{ id: string }>
}

function resolveFormAccountId(
  tx: { accountId?: string | null; cardId?: string | null },
  options: {
    draftAccountId?: string | null
    lockedAccountId?: string | null
    accounts: AccountOption[]
  }
): string | undefined {
  if (tx.accountId) return tx.accountId

  if (tx.cardId) {
    const account = options.accounts.find(item =>
      item.cards?.some(card => card.id === tx.cardId)
    )
    if (account) return account.id
  }

  if (options.draftAccountId) return options.draftAccountId
  if (options.lockedAccountId) return options.lockedAccountId

  return undefined
}

function buildTransactionEditPayload(
  values: TransactionFormValues,
  isImportedLocked: boolean,
  options: {
    registeringPayment: boolean
    txStatus: string | undefined
    notifyPayload: ReturnType<typeof buildNotifyApiPayload>
  }
) {
  const metadata = {
    description: values.description || null,
    categoryIds: values.categoryId ? [values.categoryId] : [],
    ...(options.registeringPayment || options.txStatus === 'paid'
      ? { notifyEnabled: false as const }
      : values.status === 'pending' && !options.registeringPayment
        ? options.notifyPayload
        : { notifyEnabled: false as const }),
  }

  const status =
    options.registeringPayment || options.txStatus === 'paid'
      ? undefined
      : values.status === 'pending'
        ? ('pending' as const)
        : undefined

  if (isImportedLocked) {
    return { ...metadata, status }
  }

  return {
    title: values.title,
    type: values.type,
    amount: optionalReaisToApiAmount(values.amount),
    date: calendarDateToIso(values.date),
    competenceDate: values.competenceDate
      ? calendarDateToIso(values.competenceDate)
      : null,
    accountId: values.accountId ?? null,
    cardId: values.cardId ?? null,
    status,
    ...metadata,
  }
}

export function TransactionDrawer() {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const routeSearch = useRouterState({
    select: state => state.location.search as { accountId?: string; month?: string },
  })
  const open = useDrawerStore(s => s.transactionDrawerOpen)
  const mode = useDrawerStore(s => s.transactionDrawerMode)
  const draft = useDrawerStore(s => s.transactionDraft)
  const lockedAccountId = useDrawerStore(s => s.lockedAccountId)
  const editingId = useDrawerStore(s => s.editingTransactionId)
  const close = useDrawerStore(s => s.closeTransactionDrawer)
  const openAccountDrawer = useDrawerStore(s => s.openAccountDrawer)
  const openRecurringContractDrawer = useDrawerStore(s => s.openRecurringContractDrawer)
  const openCategoryDrawer = useDrawerStore(s => s.openCategoryDrawer)
  const closeNestedDrawers = useDrawerStore(s => s.closeNestedDrawers)
  const nestedDrawerOpen = useDrawerStore(selectNestedDrawerOpen)
  const queryClient = useQueryClient()

  const { mutateAsync: createTransaction, isPending: isCreating } = useCreateTransaction()
  const { mutateAsync: createTransfer, isPending: isCreatingTransfer } = useCreateTransfer()
  const { mutateAsync: createSplit } = useCreateSplit()
  const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction()
  const { mutateAsync: payTransaction, isPending: isPaying } = usePayTransaction()
  const { mutateAsync: registerSplitPayment, isPending: isRegisteringSplitPayment } =
    useRegisterSplitPayment()
  const { mutateAsync: cancelTransactionPayment, isPending: isCancelingPayment } =
    useCancelTransactionPayment()
  const { mutateAsync: createRecurring, isPending: isCreatingRecurring } =
    useCreateRecurringTransaction()

  const { data: accountsData } = useListAccounts(slug, { query: { enabled: !!slug && open } })
  const activeAccounts = accountsData?.accounts ?? []
  const paymentAccounts = useMemo(() => filterPaymentAccounts(activeAccounts), [activeAccounts])
  const effectiveLockedAccountId = useMemo(() => {
    if (!lockedAccountId) return null
    return activeAccounts.some(account => account.id === lockedAccountId) ? lockedAccountId : null
  }, [lockedAccountId, activeAccounts])
  const { data: transactionData, isLoading: isLoadingTx, isError: isTxError } = useGetTransaction(slug, editingId ?? '', {
    query: { enabled: !!slug && !!editingId && open && mode !== 'create' },
  })

  const { data: alertRulesData } = useListAlertRules(slug, {
    query: { enabled: !!slug && open },
  })

  const orgNotifyDefaults = useMemo(
    (): OrgNotifyDefaults => orgNotifyDefaultsFromRules(alertRulesData?.rules),
    [alertRulesData?.rules]
  )

  const [notesOpen, setNotesOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [notifyState, setNotifyState] = useState<TransactionNotifyState>(defaultNotifyState())
  const [splitDraft, setSplitDraft] = useState<SplitDraftState>(defaultSplitDraftState())
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [advancePromptOpen, setAdvancePromptOpen] = useState(false)
  const [payScopeDialogOpen, setPayScopeDialogOpen] = useState(false)
  const [dateScopeDialogOpen, setDateScopeDialogOpen] = useState(false)
  const pendingDateScopeSaveRef = useRef<
    ((scope: InstallmentDateScope) => Promise<void>) | null
  >(null)
  const [cancelPaymentDialogOpen, setCancelPaymentDialogOpen] = useState(false)
  const [showAdvancePicker, setShowAdvancePicker] = useState(false)
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEdit = mode === 'edit'
  const isPay = mode === 'pay'

  const form = useForm<TransactionFormValues>({
    resolver: (values, context, options) => {
      const schema = isPay
        ? payTransactionSchema
        : isEdit
          ? editTransactionSchema
          : transactionSchema
      return zodResolver(schema)(values, context, options)
    },
    defaultValues: defaultFormValues(),
  })

  const tx = transactionData?.transaction

  const pairedTransactionId = tx?.transferPairId ?? null
  const transferPairMeta = (
    tx as
      | {
          transferPair?: {
            organizationSlug?: string
            organizationName?: string
            accountName?: string | null
          } | null
        }
      | undefined
  )?.transferPair
  const pairedOrgSlug = transferPairMeta?.organizationSlug || slug
  const { data: pairedTransactionData } = useGetTransaction(
    pairedOrgSlug ?? '',
    pairedTransactionId ?? '',
    {
      query: {
        enabled:
          !!pairedOrgSlug && !!pairedTransactionId && open && mode !== 'create',
      },
    }
  )

  const { data: attachmentsData } = useListAttachments(
    slug,
    editingId ?? '',
    { query: { enabled: !!slug && !!editingId && open && isEdit } }
  )
  const hasExistingAttachments = (attachmentsData?.attachments?.length ?? 0) > 0

  const { data: splitDebtSummaryData } = useGetSplitDebtSummary(slug, editingId ?? '', {
    query: { enabled: !!slug && !!editingId && open && (isEdit || isPay) },
  })
  const { data: splitsData } = useListSplits(slug, editingId ?? '', {
    query: { enabled: !!slug && !!editingId && open && (isEdit || isPay) },
  })
  const { data: orgMembersData } = useListUsersByOrg(slug, {
    query: { enabled: !!slug && open && (isEdit || isPay) },
  })
  const transactionSplits = splitsData?.splits ?? []
  const viewerIsCreditor = splitsData?.viewerIsCreditor ?? false
  const orgMembers = orgMembersData?.users ?? []

  const resolveSplitLabel = useCallback(
    (split: (typeof transactionSplits)[number]) => {
      if (split.userId) {
        return orgMembers.find(member => member.id === split.userId)?.name ?? 'Membro'
      }
      return split.contactName ?? 'Contato'
    },
    [orgMembers]
  )

  const installmentSummary =
    splitDebtSummaryData && (tx?.installmentsTotal ?? 0) > 1 ? splitDebtSummaryData : undefined
  const splitDebtSummary =
    splitDebtSummaryData && splitDebtSummaryData.persons.length > 0
      ? splitDebtSummaryData
      : undefined

  const splitInstallmentContext = useMemo(
    () => ({
      debtSummary: splitDebtSummary,
      installmentNumber: tx?.installmentNumber,
      installmentsTotal: tx?.installmentsTotal,
    }),
    [splitDebtSummary, tx?.installmentNumber, tx?.installmentsTotal]
  )

  const unsettledSplitItems = useMemo(
    () => buildUnsettledSplitItems(transactionSplits, resolveSplitLabel, splitInstallmentContext),
    [transactionSplits, resolveSplitLabel, splitInstallmentContext]
  )

  const hasInstallmentContext =
    (tx?.installmentsTotal ?? 0) > 1 && tx?.installmentNumber != null

  const { data: installmentSeriesData, refetch: refetchInstallmentSeries } =
    useGetInstallmentSeries(slug, editingId ?? '', {
      query: {
        enabled: !!slug && !!editingId && open && hasInstallmentContext && (isPay || isEdit),
      },
    })

  const selectedAccountId = form.watch('accountId')
  const purchaseDate = form.watch('date')
  const selectedAccount = accountsData?.accounts?.find(a => a.id === selectedAccountId)
  const isCreditCard = selectedAccount?.type === 'credit_card'
  const txType = form.watch('type')
  const isCreditCardExpense =
    isCreditCard && (isEdit || isPay ? tx?.type === 'expense' : txType === 'expense')

  const creditCardInvoiceLabel = useMemo(() => {
    if (!isCreditCardExpense || !selectedAccount) return null
    const closing = selectedAccount.closingDay ?? 1
    const due = selectedAccount.dueDay ?? 10
    const cycle = resolveBillingCycleForPurchaseDate(closing, due, purchaseDate)
    return formatInvoiceLabel(cycle.monthKey)
  }, [isCreditCardExpense, selectedAccount, purchaseDate])

  const invoiceTarget =
    tx && selectedAccount
      ? resolveInvoicePaymentTarget(
          tx,
          selectedAccount.type,
          accountsData?.accounts ?? [],
          pairedTransactionData?.transaction ?? null
        )
      : null

  const viewingInvoice =
    invoiceTarget && isOnCanonicalInvoiceView(pathname, routeSearch, invoiceTarget)

  const deletable = canDeleteTransaction(tx)

  const openPaidInvoice = () => {
    if (!invoiceTarget) return
    navigate({
      to: '/$org/accounts',
      params: { org: slug },
      search: { accountId: invoiceTarget.accountId, month: invoiceTarget.monthKey },
    })
    close()
  }

  const { data: cardsData } = useListCards(slug, selectedAccountId ?? '', {
    query: { enabled: !!slug && !!selectedAccountId && isCreditCard && open },
  })

  const cards =
    selectedAccount?.cards?.length
      ? selectedAccount.cards
      : cardsData?.cards?.map(c => ({
          id: c.id,
          label: c.label,
          lastFourDigits: c.lastFourDigits,
          status: c.status,
        })) ?? []

  const selectableCards = cards.filter(
    card => !('status' in card) || !card.status || card.status === 'active'
  )

  const isAccountLocked = !!effectiveLockedAccountId
  const isImportedLocked = isEdit && isImportedStatementTransaction(tx)
  const isAccountFieldLocked = isAccountLocked || isImportedLocked
  const isBankFieldsLocked = isImportedLocked
  const waitingForTransaction = (isEdit || isPay) && (isLoadingTx || (!tx && !isTxError))

  useEffect(() => {
    if (!open) {
      setPendingFiles([])
      setNotesOpen(false)
      setNotifyState(defaultNotifyState(orgNotifyDefaults))
      setSplitDraft(defaultSplitDraftState())
      setAdvancePromptOpen(false)
      setPayScopeDialogOpen(false)
      setShowAdvancePicker(false)
      setSelectedAdvanceIds([])
      form.reset(defaultFormValues())
      return
    }
  }, [open, form, orgNotifyDefaults])

  useLayoutEffect(() => {
    if (!open || (!isEdit && !isPay) || !tx || tx.id !== editingId) return

    const accountId = resolveFormAccountId(tx, {
      draftAccountId: draft?.accountId,
      lockedAccountId: effectiveLockedAccountId,
      accounts: activeAccounts,
    })

    if (isPay) {
      form.reset({
        ...defaultFormValues(),
        title: tx.title,
        amount: apiAmountToFormReais(tx.amount),
        paidAt: dayjs().format('YYYY-MM-DD'),
        paidAmount: resolveSettlementPrefillReais(tx, installmentSummary),
        accountId,
      })
      return
    }

    form.reset({
      ...defaultFormValues(),
      type: tx.type as TransactionFormValues['type'],
      title: tx.title,
      amount: apiAmountToFormReais(tx.amount),
      date: isoToCalendarDate(tx.date),
      competenceDate: tx.competenceDate
        ? isoToCalendarDate(tx.competenceDate)
        : undefined,
      accountId,
      cardId: tx.cardId ?? undefined,
      categoryId: tx.categoryIds?.[0] ?? draft?.categoryIds?.[0],
      status: tx.status === 'paid' ? 'paid' : 'pending',
      paidAt: tx.paidAt ? isoToCalendarDate(tx.paidAt) : dayjs().format('YYYY-MM-DD'),
      paidAmount: 0,
      description: tx.description ?? '',
      // Finite recurring contracts also set installmentsTotal on occurrences.
      // Only true installment purchases should use recurrence=installment (requires amount).
      recurrence:
        tx.installmentsTotal && !tx.recurringTransactionId ? 'installment' : 'once',
      installmentsTotal: tx.installmentsTotal ?? undefined,
    })
    setNotifyState(notifyStateFromTransaction(tx, orgNotifyDefaults))
    setNotesOpen(Boolean(tx.description?.trim()))
  }, [
    open,
    isEdit,
    isPay,
    editingId,
    tx,
    draft?.categoryIds,
    draft?.accountId,
    effectiveLockedAccountId,
    activeAccounts,
    form,
    installmentSummary,
    orgNotifyDefaults,
  ])

  useEffect(() => {
    if (!open || (!isEdit && !isPay) || !tx || tx.id !== editingId) return

    const accountId = resolveFormAccountId(tx, {
      draftAccountId: draft?.accountId,
      lockedAccountId: effectiveLockedAccountId,
      accounts: activeAccounts,
    })
    if (!accountId || form.getValues('accountId') === accountId) return

    form.setValue('accountId', accountId)
  }, [
    open,
    isEdit,
    isPay,
    tx,
    editingId,
    draft?.accountId,
    effectiveLockedAccountId,
    activeAccounts,
    form,
  ])

  useEffect(() => {
    if (!open || isEdit || isPay) return

    form.reset({
      ...defaultFormValues(slug),
      type: (draft?.type as TransactionFormValues['type']) ?? 'expense',
      title: draft?.title ?? '',
      amount: draft?.amount ? apiAmountToFormReais(draft.amount) : null,
      date: draft?.date ? isoToCalendarDate(draft.date) : dayjs().format('YYYY-MM-DD'),
      competenceDate: draft?.competenceDate
        ? isoToCalendarDate(draft.competenceDate)
        : undefined,
      accountId: draft?.accountId ?? effectiveLockedAccountId ?? paymentAccounts[0]?.id,
      cardId: draft?.cardId ?? undefined,
      categoryId: draft?.categoryIds?.[0],
      status: (draft?.status as TransactionFormValues['status']) ?? 'pending',
      description: draft?.description ?? '',
      transferToOrganizationSlug: slug,
    })
    setNotesOpen(Boolean(draft?.description?.trim()))
  }, [open, isEdit, isPay, draft, form, effectiveLockedAccountId, paymentAccounts, slug])

  useEffect(() => {
    if (!open || !isEdit) return
    if (hasExistingAttachments) setNotesOpen(true)
  }, [open, isEdit, hasExistingAttachments])

  useEffect(() => {
    if (!open || !effectiveLockedAccountId) return
    if (form.getValues('accountId') !== effectiveLockedAccountId) {
      form.setValue('accountId', effectiveLockedAccountId)
      form.setValue('cardId', undefined)
    }
  }, [open, effectiveLockedAccountId, form])

  useEffect(() => {
    if (!open || isEdit || isPay) return

    if (!isCreditCard) {
      if (form.getValues('cardId')) form.setValue('cardId', undefined)
      return
    }

    const currentCardId = form.getValues('cardId')
    const cardStillValid =
      !!currentCardId && selectableCards.some(card => card.id === currentCardId)

    if (currentCardId && selectableCards.length > 0 && !cardStillValid) {
      form.setValue('cardId', undefined)
    }

    if (selectableCards.length === 1) {
      const soleCard = selectableCards[0]
      if (soleCard && form.getValues('cardId') !== soleCard.id) {
        form.setValue('cardId', soleCard.id)
      }
    }
  }, [open, isEdit, isPay, isCreditCard, selectableCards, form])

  useEffect(() => {
    if (!open || !isPay || !tx || isLoadingTx) return

    const account = accountsData?.accounts?.find(a => a.id === tx.accountId)
    if (account?.type === 'credit_card' && tx.type === 'expense') {
      toast.info('Compras no cartão são quitadas pelo pagamento da fatura.')
      close()
    }
  }, [open, isPay, tx, isLoadingTx, accountsData?.accounts, close])

  const amount = form.watch('amount')
  const installmentsTotal = form.watch('installmentsTotal')
  const paidAmountWatched = form.watch('paidAmount')
  const periodicity = form.watch('periodicity')

  useEffect(() => {
    if (!open) return
    setSplitDraft(prev => {
      if (prev.splitMode === 'none' || prev.splitMode === 'custom') return prev
      const baseAmount = amount ?? 0
      const splitAmountReais = prev.splitMode === 'half' ? baseAmount / 2 : baseAmount
      if (prev.splitAmountReais === splitAmountReais) return prev
      return { ...prev, splitAmountReais }
    })
  }, [open, amount])

  const status = form.watch('status')
  const recurrence = form.watch('recurrence')
  const recurringDuration = form.watch('recurringDuration')

  useEffect(() => {
    if (!open || !isEdit || isPay || !tx) return
    if (tx.status === 'paid') return
    if (status !== 'paid' && !isTransactionPartial(tx.status)) return

    const prefill = resolveSettlementPrefillReais(tx, installmentSummary)
    if (prefill > 0 && (form.getValues('paidAmount') ?? 0) <= 0) {
      form.setValue('paidAmount', prefill)
    }
  }, [open, isEdit, isPay, status, tx, form, installmentSummary])

  const installmentAmountReais = useMemo(
    () => resolveTransactionInstallmentAmountReais(tx, installmentSummary),
    [tx, installmentSummary]
  )
  const installmentRemainingReais = useMemo(
    () => resolveTransactionInstallmentRemainingReais(tx, installmentSummary),
    [tx, installmentSummary]
  )
  const isReminderWithoutValue = isTransactionReminderWithoutValue(tx?.amount)

  useEffect(() => {
    if (!isPay || !showAdvancePicker) return
    const paymentAmount = paidAmountWatched ?? 0
    if (paymentAmount <= installmentRemainingReais) {
      setShowAdvancePicker(false)
      setSelectedAdvanceIds([])
    }
  }, [isPay, showAdvancePicker, paidAmountWatched, installmentRemainingReais])

  useEffect(() => {
    if (!showAdvancePicker || isPay) return
    const installments = installmentSeriesData?.installments ?? []
    form.setValue(
      'paidAmount',
      computeAdvancePaymentTotalReais(
        installmentRemainingReais,
        installments,
        selectedAdvanceIds
      )
    )
  }, [
    showAdvancePicker,
    isPay,
    selectedAdvanceIds,
    installmentRemainingReais,
    installmentSeriesData?.installments,
    form,
  ])

  const applyPayInstallmentScope = async (result: PayInstallmentScopeResult) => {
    if (!slug || !editingId || !tx) return

    const kind = settlementKindFromType(tx.type)
    const paymentAmount = Math.max(0, result.paidAmountReais)
    if (paymentAmount <= 0) {
      toast.error(enterAmountToast(kind))
      return
    }

    if (unsettledSplitItems.length > 0 && !viewerIsCreditor) {
      toast.info(
        'Peça confirmação do pagamento em "Divisões" (Avisar que paguei) antes de marcar a transação como paga.'
      )
      return
    }

    const paidAt =
      form.getValues('paidAt') || dayjs().format('YYYY-MM-DD')

    try {
      await runUnifiedSettlement({
        reimbursements: result.reimbursements,
        registerSplitPayment: async input => {
          await registerSplitPayment({
            slug,
            transactionId: editingId,
            id: input.splitId,
            data: {
              amount: reaisToMoneyString(input.amountReais),
              method: input.method,
            },
          })
        },
        payTransaction: async () => {
          await payTransaction({
            slug,
            id: editingId,
            data: {
              paidAt: calendarDateToIso(paidAt),
              paidAmount: reaisToMoneyString(paymentAmount),
              ...(result.advanceTransactionIds.length > 0
                ? { advanceTransactionIds: result.advanceTransactionIds }
                : {}),
            },
          })
          toast.success(
            settlementRegisteredToast(kind, result.advanceTransactionIds.length > 0)
          )
          await invalidateAll()
          close()
        },
      })
      if (slug && editingId) {
        queryClient.invalidateQueries({ queryKey: getListSplitsQueryKey(slug, editingId) })
        queryClient.invalidateQueries({
          queryKey: getGetSplitDebtSummaryQueryKey(slug, editingId),
        })
        queryClient.invalidateQueries({ queryKey: getSplitTransactionIdsQueryKey(slug) })
      }
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao registrar'))
    }
  }

  /** Debtor with open splits cannot settle; creditor must use the pay modal (reimbursement Qs). */
  const assertCanSettleFromForm = (): boolean => {
    if (unsettledSplitItems.length === 0) return true
    if (!viewerIsCreditor) {
      toast.info(
        'Peça confirmação do pagamento em "Divisões" (Avisar que paguei) antes de marcar a transação como paga.'
      )
      return false
    }
    void refetchInstallmentSeries().finally(() => {
      setPayScopeDialogOpen(true)
    })
    return false
  }

  const installmentPaidReais = useMemo(
    () => moneyStringToReais(tx?.paidAmount),
    [tx?.paidAmount]
  )
  const displayStatus = resolveTransactionDisplayStatus(tx?.status, status)
  const isPaidLocked = isEdit && tx?.status === 'paid'
  const showPaymentFields =
    !isCreditCardExpense &&
    (isPay ||
      (isEdit &&
        tx?.status !== 'paid' &&
        (status === 'paid' || isTransactionPartial(tx?.status))))

  const installmentPreview = useMemo(() => {
    if (recurrence !== 'installment') return null
    return buildInstallmentPreview({
      totalAmount: amount ?? 0,
      installmentsTotal: installmentsTotal ?? 0,
      startDate: purchaseDate,
      periodicity,
      account: selectedAccount,
      isCreditCardExpense,
      split:
        splitDraft.splitMode !== 'none'
          ? {
              splitMode: splitDraft.splitMode,
              splitAmountReais: splitDraft.splitAmountReais,
            }
          : null,
    })
  }, [
    recurrence,
    amount,
    installmentsTotal,
    purchaseDate,
    periodicity,
    selectedAccount,
    isCreditCardExpense,
    splitDraft.splitMode,
    splitDraft.splitAmountReais,
  ])

  const isTransfer = txType === 'transfer'
  const settlementKind = settlementKindFromType(isEdit || isPay ? tx?.type : txType)
  const installmentSettlementHintText = installmentSettlementHint(
    settlementKind,
    installmentRemainingReais,
    installmentPaidReais
  )
  const nextOpenInstallment = useMemo(() => {
    if (!hasInstallmentContext || showAdvancePicker) return null
    const future = listFutureUnpaidInstallments(
      installmentSeriesData?.installments ?? [],
      tx?.installmentNumber ?? 1
    )
    if (future[0]) {
      return {
        installmentNumber: future[0].installmentNumber,
        amountReais: Number.parseFloat(future[0].amount),
      }
    }
    if (canOfferInstallmentAdvance(tx?.installmentNumber, tx?.installmentsTotal)) {
      return {
        installmentNumber: (tx?.installmentNumber ?? 1) + 1,
        amountReais: installmentRemainingReais,
      }
    }
    return null
  }, [
    hasInstallmentContext,
    showAdvancePicker,
    installmentSeriesData?.installments,
    tx?.installmentNumber,
    tx?.installmentsTotal,
    installmentRemainingReais,
  ])
  const underpaymentCarryHintText = useMemo(() => {
    if (!nextOpenInstallment || showAdvancePicker) return null
    return underpaymentCarryHint(
      settlementKind,
      paidAmountWatched ?? 0,
      installmentRemainingReais,
      nextOpenInstallment.installmentNumber,
      nextOpenInstallment.amountReais
    )
  }, [
    nextOpenInstallment,
    showAdvancePicker,
    settlementKind,
    paidAmountWatched,
    installmentRemainingReais,
  ])
  const resolveSettlementSuccessToast = (
    paymentAmount: number,
    withAdvance: boolean
  ) => {
    if (
      !withAdvance &&
      nextOpenInstallment &&
      paymentAmount > 0 &&
      paymentAmount < installmentRemainingReais
    ) {
      const shortfall = installmentRemainingReais - paymentAmount
      return underpaymentCarryToast(
        settlementKind,
        paymentAmount,
        shortfall,
        nextOpenInstallment.installmentNumber,
        nextOpenInstallment.amountReais + shortfall
      )
    }
    return settlementRegisteredToast(settlementKind, withAdvance)
  }
  const showSplitDraft =
    !isPay && !isTransfer && !isEdit && txType === 'expense' && recurrence !== 'recurring'
  const showCardField = !isTransfer && isCreditCard && selectableCards.length > 1
  const isPending =
    isCreating ||
    isCreatingTransfer ||
    isUpdating ||
    isPaying ||
    isRegisteringSplitPayment ||
    isCreatingRecurring ||
    isCancelingPayment
  const advancePaymentTotalReais = useMemo(() => {
    if (!showAdvancePicker) return installmentRemainingReais
    return computeAdvancePaymentTotalReais(
      installmentRemainingReais,
      installmentSeriesData?.installments ?? [],
      selectedAdvanceIds
    )
  }, [
    showAdvancePicker,
    installmentRemainingReais,
    installmentSeriesData?.installments,
    selectedAdvanceIds,
  ])
  const canConfirmPay = useMemo(() => {
    if (!isPay) return true
    const paymentAmount = paidAmountWatched ?? 0
    if (paymentAmount <= 0) return false
    if (isReminderWithoutValue || paymentAmount <= installmentRemainingReais) return true
    if (!showAdvancePicker) return true
    if (selectedAdvanceIds.length === 0) return false
    return Math.abs(paymentAmount - advancePaymentTotalReais) < 0.005
  }, [
    isPay,
    paidAmountWatched,
    isReminderWithoutValue,
    installmentRemainingReais,
    showAdvancePicker,
    selectedAdvanceIds.length,
    advancePaymentTotalReais,
  ])
  const { isSubmitted, errors } = useFormState({ control: form.control })

  const validationErrorMessage = isSubmitted
    ? buildRequiredFieldsMessage(
        errors,
        isPay
          ? {
              paidAmount: amountFieldValidationLabel(settlementKind),
              paidAt: dateFieldValidationLabel(settlementKind),
            }
          : {
              title: 'descrição',
              amount: 'valor',
              categoryId: 'categoria',
              accountId: 'conta',
              transferToAccountId: 'conta destino',
              recurringRepetitions: 'repetições',
              recurringEndDate: 'data final',
            }
      )
    : null

  const invalidateAll = async () => {
    if (!slug) return
    await invalidateTransactionQueries(queryClient, slug)
  }

  const uploadPendingFiles = async (transactionId: string) => {
    if (!slug) return
    for (const file of pendingFiles) {
      await uploadTransactionAttachment(slug, transactionId, file)
    }
    setPendingFiles([])
  }

  const applyDraftSplits = async (
    transactions: Array<{
      id: string
      amount: string | null
      installmentNumber?: number | null
      installmentsTotal?: number | null
    }>
  ): Promise<number> => {
    if (splitDraft.splitMode === 'none' || !slug) return 0

    if (splitDraft.collectLumpSum) {
      const withAmount = transactions.filter(transaction => transaction.amount)
      if (withAmount.length === 0) return 0

      const first =
        [...withAmount].sort(
          (a, b) => (a.installmentNumber ?? 1) - (b.installmentNumber ?? 1)
        )[0] ?? withAmount[0]

      const purchaseTotalReais = withAmount.reduce(
        (sum, transaction) => sum + moneyStringToReais(transaction.amount ?? '0'),
        0
      )
      const body = buildSplitCreateBody(reaisToMoneyString(purchaseTotalReais), {
        ...splitDraft,
        collectLumpSum: true,
      })
      if (!body) return 0

      await createSplit({
        slug,
        transactionId: first.id,
        data: body,
      })
      return 1
    }

    let created = 0
    for (const transaction of transactions) {
      if (!transaction.amount) continue
      const body = buildSplitCreateBody(transaction.amount, splitDraft, {
        installmentsTotal: transaction.installmentsTotal,
        installmentNumber: transaction.installmentNumber,
      })
      if (!body) continue
      await createSplit({
        slug,
        transactionId: transaction.id,
        data: body,
      })
      created += 1
    }
    return created
  }

  const needsReimbursementStep =
    viewerIsCreditor && unsettledSplitItems.length > 0

  const onSubmit = async (values: TransactionFormValues) => {
    if (!slug) return
    if (isPaidLocked) return

    if (editingId && (isEdit || isPay) && !tx) {
      toast.error('Aguarde o carregamento do lançamento')
      return
    }

    const notifyPayload = buildNotifyApiPayload(notifyState)
    if (notifyState.notifyEnabled && !notifyPayload.notifyEnabled) {
      toast.error('Informe o responsável pelos lembretes')
      return
    }

    if (showSplitDraft) {
      const splitError = validateSplitDraft(splitDraft)
      if (splitError) {
        toast.error(splitError)
        return
      }
    }

    try {
      if (isPay && editingId && tx) {
        const paymentAmount = values.paidAmount ?? 0

        if (paymentAmount <= 0) {
          toast.error(enterAmountToast(settlementKind))
          return
        }

        if (unsettledSplitItems.length > 0 && !viewerIsCreditor) {
          toast.info(
            'Peça confirmação do pagamento em "Divisões" (Avisar que paguei) antes de marcar a transação como paga.'
          )
          return
        }

        void refetchInstallmentSeries().finally(() => {
          setPayScopeDialogOpen(true)
        })
        return
      }

      if (isEdit && editingId && tx) {
        const remaining = installmentRemainingReais
        const paymentAmount = values.paidAmount ?? 0
        const withoutValue = isTransactionReminderWithoutValue(tx.amount)
        const registeringPayment =
          tx.status !== 'paid' &&
          paymentAmount > 0 &&
          remaining > 0 &&
          (values.status === 'paid' || isTransactionPartial(tx.status))

        if (
          values.status === 'paid' &&
          tx.status !== 'paid' &&
          paymentAmount <= 0 &&
          remaining > 0
        ) {
          toast.error(enterAmountToast(settlementKind))
          return
        }

        if (registeringPayment && !withoutValue && paymentAmount > remaining) {
          if (!showAdvancePicker) {
            if (canOfferInstallmentAdvance(tx.installmentNumber, tx.installmentsTotal)) {
              void refetchInstallmentSeries().finally(() => {
                setPayScopeDialogOpen(true)
              })
              return
            }
            toast.error(`Valor excede o saldo da parcela (${formatCurrency(remaining)})`)
            return
          }

          const installments = installmentSeriesData?.installments ?? []
          const expectedTotal = computeAdvancePaymentTotalReais(
            remaining,
            installments,
            selectedAdvanceIds
          )

          if (selectedAdvanceIds.length === 0) {
            toast.error('Selecione ao menos uma parcela para adiantar')
            return
          }

          if (Math.abs(paymentAmount - expectedTotal) >= 0.005) {
            toast.error(amountMustMatchSelectionToast(settlementKind))
            return
          }

          if (!assertCanSettleFromForm()) return

          await payTransaction({
            slug,
            id: editingId,
            data: {
              paidAt: calendarDateToIso(values.paidAt),
              paidAmount: reaisToMoneyString(paymentAmount),
              advanceTransactionIds: selectedAdvanceIds,
            },
          })

          await updateTransaction({
            slug,
            id: editingId,
            data: buildTransactionEditPayload(values, isImportedLocked, {
              registeringPayment: true,
              txStatus: tx.status,
              notifyPayload,
            }),
          })
          if (pendingFiles.length) await uploadPendingFiles(editingId)
          toast.success(settlementRegisteredToast(settlementKind, true))
          await invalidateAll()
          close()
          return
        }

        if (values.status === 'pending' && installmentPaidReais > 0) {
          toast.error('Não é possível voltar para pendente com pagamentos registrados')
          return
        }

        if (registeringPayment) {
          if (!assertCanSettleFromForm()) return

          await payTransaction({
            slug,
            id: editingId,
            data: {
              paidAt: calendarDateToIso(values.paidAt),
              paidAmount: reaisToMoneyString(paymentAmount),
              ...(showAdvancePicker && selectedAdvanceIds.length > 0
                ? { advanceTransactionIds: selectedAdvanceIds }
                : {}),
            },
          })

          await updateTransaction({
            slug,
            id: editingId,
            data: buildTransactionEditPayload(values, isImportedLocked, {
              registeringPayment: true,
              txStatus: tx.status,
              notifyPayload,
            }),
          })
          if (pendingFiles.length) await uploadPendingFiles(editingId)
          toast.success(
            resolveSettlementSuccessToast(
              paymentAmount,
              showAdvancePicker && selectedAdvanceIds.length > 0
            )
          )
          await invalidateAll()
          close()
          return
        }

        // Row fully covered but status not yet paid — confirm without a new payment.
        if (values.status === 'paid' && tx.status !== 'paid' && remaining <= 0) {
          await updateTransaction({
            slug,
            id: editingId,
            data: {
              ...buildTransactionEditPayload(values, isImportedLocked, {
                registeringPayment: false,
                txStatus: tx.status,
                notifyPayload,
              }),
              status: 'paid',
            },
          })
          if (pendingFiles.length) await uploadPendingFiles(editingId)
          toast.success(installmentConfirmedToast(settlementKind))
          await invalidateAll()
          close()
          return
        }

        const editPayload = buildTransactionEditPayload(values, isImportedLocked, {
          registeringPayment,
          txStatus: tx.status,
          notifyPayload,
        })

        const finishEditSave = async (scope?: InstallmentDateScope) => {
          await updateTransaction({
            slug,
            id: editingId,
            data: {
              ...editPayload,
              ...(scope ? { installmentDateScope: scope } : {}),
            },
          })
          if (pendingFiles.length) await uploadPendingFiles(editingId)
          toast.success(
            registeringPayment
              ? resolveSettlementSuccessToast(paymentAmount, false)
              : 'Lançamento atualizado'
          )
          await invalidateAll()
          close()
        }

        if (
          !registeringPayment &&
          shouldAskInstallmentDateScope({
            isCreditCardAccount: isCreditCard,
            installmentsTotal: tx.installmentsTotal,
            originalDateKey: isoToCalendarDate(tx.date),
            nextDateKey: values.date,
          })
        ) {
          pendingDateScopeSaveRef.current = finishEditSave
          setDateScopeDialogOpen(true)
          return
        }

        await finishEditSave()
        return
      }

      if (editingId) {
        toast.error('Não foi possível atualizar o lançamento')
        return
      }

      if (values.recurrence === 'recurring') {
        const { frequency, interval } = parseTransactionPeriodicity(values.periodicity)
        const result = await createRecurring({
          slug,
          data: {
            title: values.title,
            // Recurring template amount is NOT NULL in DB; use 0 as reminder-without-value.
            amount: optionalReaisToApiAmount(values.amount) ?? '0.00',
            type: values.type === 'income' ? 'income' : 'expense',
            accountId: values.accountId ?? null,
            categoryId: values.categoryId ?? null,
            counterparty: values.counterparty?.trim() ? values.counterparty.trim() : null,
            frequency,
            interval,
            startDate: calendarDateToIso(values.date),
            installmentsTotal:
              values.recurringDuration === 'times' ? values.recurringRepetitions ?? null : null,
            endDate:
              values.recurringDuration === 'until' && values.recurringEndDate
                ? calendarDateToIso(values.recurringEndDate)
                : null,
          },
        })
        const firstDate = dayjs(values.date).format('DD/MM/YYYY')
        toast.success(
          result.materializedCount > 0
            ? `Contrato criado. O recebimento de ${firstDate} já aparece na lista.`
            : 'Contrato recorrente criado'
        )
        invalidateAll()
        close()
        return
      }

      if (isTransfer) {
        const toOrgSlug = values.transferToOrganizationSlug || slug
        const isoDate = calendarDateToIso(values.date)
        const amount = reaisToMoneyString(values.amount ?? 0)

        await createTransfer({
          slug,
          data: {
            fromAccountId: String(values.accountId),
            toOrganizationSlug: toOrgSlug,
            toAccountId: String(values.transferToAccountId),
            amount,
            date: isoDate,
            title: values.title?.trim() || undefined,
            description: values.description || null,
          },
        })
        toast.success('Transferência registrada')
        await invalidateTransactionQueries(queryClient, slug)
        if (toOrgSlug !== slug) {
          await invalidateTransactionQueries(queryClient, toOrgSlug)
        }
        close()
        return
      }

      const result = await createTransaction({
        slug,
        data: {
          title: values.title,
          type: values.type,
          amount: optionalReaisToApiAmount(values.amount),
          date: calendarDateToIso(values.date),
          competenceDate: values.competenceDate
            ? calendarDateToIso(values.competenceDate)
            : null,
          accountId: values.accountId ?? null,
          cardId: values.cardId ?? null,
          status: values.status,
          description: values.description || null,
          categoryIds: values.categoryId ? [values.categoryId] : [],
          installmentNumber: values.recurrence === 'installment' ? 1 : null,
          installmentsTotal:
            values.recurrence === 'installment' ? values.installmentsTotal ?? null : null,
          installmentPeriodicity:
            values.recurrence === 'installment' ? values.periodicity : null,
          ...(values.status === 'pending' ? notifyPayload : { notifyEnabled: false }),
        },
      })

      if (pendingFiles.length) await uploadPendingFiles(result.transaction.id)

      const createdTransactions = result.transactions ?? [result.transaction]
      const splitsCreated = showSplitDraft ? await applyDraftSplits(createdTransactions) : 0

      toast.success(
        splitsCreated > 0
          ? result.installmentsCreated && result.installmentsCreated > 1
            ? `${result.installmentsCreated} parcelas criadas com divisão`
            : 'Lançamento criado com divisão'
          : result.installmentsCreated && result.installmentsCreated > 1
            ? `${result.installmentsCreated} parcelas criadas`
            : 'Lançamento criado'
      )
      invalidateAll()
      close()
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao salvar lançamento'))
    }
  }

  const openSettlementFlow = () => {
    const prefill = resolveSettlementPrefillReais(tx, installmentSummary)
    if (prefill > 0) {
      form.setValue('paidAmount', prefill)
    }
    form.setValue('status', 'paid')
    void refetchInstallmentSeries().finally(() => {
      setPayScopeDialogOpen(true)
    })
  }

  const handleCancelPayment = async () => {
    if (!slug || !editingId) return

    try {
      await cancelTransactionPayment({ slug, id: editingId })
      toast.success(
        settlementKind === 'income' ? 'Recebimento cancelado' : 'Pagamento cancelado'
      )
      queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(slug, editingId) })
      invalidateAll()
      setCancelPaymentDialogOpen(false)
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao cancelar pagamento'))
    }
  }

  const showFooterSettleButton =
    isEdit &&
    !isPaidLocked &&
    !isCreditCardExpense &&
    !isTransfer &&
    tx?.status !== 'paid'

  const drawerTitle = isPay
    ? registerSettlementButtonLabel(settlementKind, {
        withSplits: needsReimbursementStep,
      })
    : isEdit
      ? 'Editar Transação'
      : txType === 'income'
        ? 'Nova Receita'
        : txType === 'transfer'
          ? 'Nova Transferência'
          : 'Nova Despesa'
  const submitLabel = isPay
    ? payInstallmentScopeConfirmLabel(settlementKind)
    : isEdit
      ? 'Salvar Alterações'
      : recurrence === 'recurring'
        ? 'Criar Recorrência'
        : 'Criar Lançamento'

  return (
    <Drawer
      open={open}
      onOpenChange={v => !v && close()}
      direction="right"
    >
      <DrawerContent
        className={stackyDrawerContent}
        overlayClassName={cn(
          stackyDrawerOverlay,
          nestedDrawerOpen && stackyDrawerOverlaySuppressed
        )}
        overlayDismissible={!nestedDrawerOpen}
        onOverlayDismiss={close}
        stackedOverlayClassName={stackyDrawerOverlayNested}
        onStackedOverlayDismiss={closeNestedDrawers}
        stackable
        stacked={nestedDrawerOpen}
      >
        <DrawerHeader className={stackyDrawerHeader}>
          <DrawerTitle className={stackyDrawerTitle}>{drawerTitle}</DrawerTitle>
          <button
            type="button"
            aria-label="Fechar"
            className={stackyDrawerCloseButton}
            onClick={close}
          >
            <X className="size-5" />
          </button>
        </DrawerHeader>

        {waitingForTransaction ? (
          <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
            Carregando...
          </div>
        ) : isTxError && (isEdit || isPay) ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-slate-500">
            <p>Não foi possível carregar o lançamento.</p>
            <Button type="button" variant="outline" onClick={close}>
              Fechar
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className={cn('min-h-0 flex-1 space-y-5 overflow-y-auto p-6', stackyDrawerForm)}>
                {isImportedLocked && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                    Lançamento importado do extrato. Descrição, valor, data e conta vêm do banco e
                    não podem ser alterados. Você pode editar categoria, divisões e observações.
                  </div>
                )}
                {isPaidLocked && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900">
                    Esta transação está paga e não pode ser editada. Para alterar, cancele o
                    pagamento.
                  </div>
                )}
                {invoiceTarget && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
                    {viewingInvoice ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                          Pagamento da fatura de {invoiceTarget.cycleLabel}
                        </p>
                        <p className="text-sm text-slate-600">
                          Valor: {formatCentsString(tx?.amount ?? '0')} · você está vendo esta fatura
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-600">
                          Pagamento da fatura de {invoiceTarget.cycleLabel}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          onClick={openPaidInvoice}
                        >
                          Ver fatura
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {(isEdit || isPay) &&
                  tx?.status === 'pending' &&
                  !isTransfer &&
                  !isCreditCardExpense &&
                  editingId && (
                    <TransactionSchedulePaymentSection
                      slug={slug}
                      transactionId={editingId}
                      dueDate={tx.date}
                      paymentScheduledAt={tx.paymentScheduledAt}
                      kind={settlementKind}
                      disabled={isPending}
                    />
                  )}
                <fieldset
                  disabled={isPaidLocked}
                  className={cn('min-w-0 space-y-5 border-0 p-0', isPaidLocked && 'opacity-70')}
                >
                {!isPay && (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={v => {
                          if (!v) return
                          const previousType = field.value
                          field.onChange(v)
                          if (v === 'transfer' && slug) {
                            form.setValue('transferToOrganizationSlug', slug)
                            const currentTitle = form.getValues('title')
                            if (!currentTitle?.trim()) {
                              form.setValue('title', 'Transferência: Origem → Destino')
                            }
                          }
                          const categoryId = form.getValues('categoryId')
                          if (
                            categoryId &&
                            previousType !== 'transfer' &&
                            v !== 'transfer' &&
                            previousType !== v
                          ) {
                            form.setValue('categoryId', undefined)
                          }
                        }}
                        className={stackyTypeSegmentedControl}
                        disabled={isEdit}
                      >
                        <ToggleGroupItem
                          value="expense"
                          className={cn(stackyTypeSegmentItem, stackySegmentItemExpense)}
                        >
                          Despesa
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="income"
                          className={cn(stackyTypeSegmentItem, stackySegmentItemIncome)}
                        >
                          Receita
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="transfer"
                          className={cn(stackyTypeSegmentItem, stackySegmentItemTransfer)}
                        >
                          Transferência
                        </ToggleGroupItem>
                      </ToggleGroup>
                    )}
                  />
                )}

                <FormErrorBanner message={validationErrorMessage} />

                {isEdit && tx?.recurringTransactionId && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                    Este lançamento faz parte de um contrato recorrente de{' '}
                    {tx.type === 'income' ? 'receita' : 'despesa'}.{' '}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-violet-700 underline-offset-2 hover:underline"
                      onClick={() => {
                        const recurringId = tx.recurringTransactionId
                        if (recurringId) openRecurringContractDrawer(recurringId)
                      }}
                    >
                      <RefreshCw className="size-3.5" />
                      Editar contrato
                    </button>
                  </div>
                )}

                {isPay ? (
                  <>
                    <div className="rounded-lg bg-slate-50 p-4 space-y-1">
                      <p className="font-medium text-slate-900">{tx?.title}</p>
                      <p className="text-sm text-slate-500">
                        {isReminderWithoutValue
                          ? `Valor ainda não definido — informe o ${settledAmountLabel(settlementKind).toLowerCase()}`
                          : `Valor da parcela: ${formatCurrency(installmentAmountReais)}`}
                      </p>
                      {hasInstallmentContext && (
                        <p className="text-sm text-slate-500">
                          Parcela {tx?.installmentNumber} de {tx?.installmentsTotal}
                        </p>
                      )}
                      {installmentPaidReais > 0 && (
                        <p className="text-sm text-amber-700">
                          {alreadySettledFragment(settlementKind)}{' '}
                          {formatCurrency(installmentPaidReais)} · Saldo{' '}
                          {formatCurrency(installmentRemainingReais)}
                        </p>
                      )}
                    </div>
                    {viewerIsCreditor && <SplitPaymentPayBanner items={unsettledSplitItems} />}
                    <FormField
                      control={form.control}
                      name="paidAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {amountToSettleAccountLabel(settlementKind)} <FormRequiredMark />
                          </FormLabel>
                          <FormControl>
                            <CurrencyInput value={field.value ?? 0} onValueChange={field.onChange} />
                          </FormControl>
                          {installmentRemainingReais > 0 && (
                            <p className="text-xs text-slate-500">
                              Saldo da parcela: {formatCurrency(installmentRemainingReais)}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paidAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {settlementDateLabel(settlementKind)} <FormRequiredMark />
                          </FormLabel>
                          <FormControl>
                            <DatePickerInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="dd/mm/aaaa"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {showAdvancePicker && hasInstallmentContext && (
                      <AdvanceInstallmentsPicker
                        installments={installmentSeriesData?.installments ?? []}
                        currentInstallmentNumber={tx?.installmentNumber ?? 1}
                        selectedIds={selectedAdvanceIds}
                        onSelectedIdsChange={setSelectedAdvanceIds}
                        paidAmountReais={paidAmountWatched ?? 0}
                        currentRemainingReais={installmentRemainingReais}
                        kind={settlementKind}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <div className={stackyDrawerFormRow}>
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem className={cn(stackyDrawerFormItem, 'col-span-5')}>
                            <div className={stackyDrawerFormLabelSlot}>
                              <FormLabel>
                                Descrição <FormRequiredMark />
                              </FormLabel>
                            </div>
                            <FormControl>
                              <Input
                                placeholder={
                                  isTransfer
                                    ? 'Transferência: conta origem → destino'
                                    : 'Ex: Mercado, Salário...'
                                }
                                disabled={isBankFieldsLocked}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem className={cn(stackyDrawerFormItem, 'col-span-3')}>
                            <div className={stackyDrawerFormLabelSlot}>
                              <FormLabel>
                                Valor
                                {(isTransfer || recurrence === 'installment' || status === 'paid') && (
                                  <>
                                    {' '}
                                    <FormRequiredMark />
                                  </>
                                )}
                              </FormLabel>
                            </div>
                            <FormControl>
                              <CurrencyInput
                                value={field.value}
                                onValueChange={field.onChange}
                                allowEmpty
                                title="Deixe em branco se ainda não souber o valor"
                                disabled={isBankFieldsLocked}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {!isTransfer ? (
                        isCreditCardExpense ? (
                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem className={cn(stackyDrawerFormItem, 'col-span-4')}>
                                <div className={stackyDrawerFormLabelSlot}>
                                  <FormLabel>Competência</FormLabel>
                                </div>
                                <FormControl>
                                  <DatePickerInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="dd/mm/aaaa"
                                    disabled={isBankFieldsLocked}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name="competenceDate"
                            render={({ field }) => (
                              <FormItem className={cn(stackyDrawerFormItem, 'col-span-4')}>
                                <div className={stackyDrawerFormLabelSlot}>
                                  <FormLabel>Competência</FormLabel>
                                </div>
                                <FormControl>
                                  <DatePickerInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="dd/mm/aaaa"
                                    disabled={isBankFieldsLocked}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )
                      ) : (
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className={cn(stackyDrawerFormItem, 'col-span-4')}>
                              <div className={stackyDrawerFormLabelSlot}>
                                <FormLabel>Data</FormLabel>
                              </div>
                              <FormControl>
                                <DatePickerInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="dd/mm/aaaa"
                                  disabled={isBankFieldsLocked}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    {isTransfer && (
                      <p className="-mt-2 text-xs text-slate-500">
                        Descrição preenchida automaticamente pelas contas; você pode editar.
                      </p>
                    )}

                    {!isTransfer && (
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <div className={stackyDrawerLabelRow}>
                              <FormLabel>
                                Categoria {!isEdit ? <FormRequiredMark /> : null}
                              </FormLabel>
                              <button
                                type="button"
                                aria-label="Nova categoria"
                                className={stackyDrawerAddButton}
                                onClick={() =>
                                  openCategoryDrawer(
                                    id => form.setValue('categoryId', id),
                                    txType === 'income' ? 'income' : 'expense'
                                  )
                                }
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                            <FormControl>
                              <CategorySelect
                                value={field.value}
                                type={txType === 'income' ? 'income' : 'expense'}
                                onChange={categoryId => field.onChange(categoryId ?? undefined)}
                                className={stackySelectTrigger}
                                enabled={open}
                                instanceKey={editingId ?? 'create'}
                                clearable={isEdit}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {isTransfer ? (
                      <TransferDestinationFields
                        control={form.control}
                        setValue={form.setValue}
                        getValues={form.getValues}
                        sourceOrgSlug={slug}
                        sourceAccounts={activeAccounts}
                        sourceAccountId={selectedAccountId}
                        transferToAccountId={form.watch('transferToAccountId')}
                        destinationOrgSlug={form.watch('transferToOrganizationSlug')}
                        open={open}
                        instanceKey={editingId ?? 'create'}
                      />
                    ) : isCreditCardExpense ? (
                      <div className={stackyDrawerFormRow}>
                        <FormField
                          control={form.control}
                          name="accountId"
                          render={({ field }) => (
                            <FormItem className={cn(stackyDrawerFormItem, 'col-span-7')}>
                              <div className={stackyDrawerLabelRow}>
                                <FormLabel>
                                  Conta / Cartão <FormRequiredMark />
                                </FormLabel>
                                {!isAccountFieldLocked && (
                                  <button
                                    type="button"
                                    aria-label="Novo produto financeiro"
                                    className={stackyDrawerAddButton}
                                    onClick={() =>
                                      openAccountDrawer(id => form.setValue('accountId', id))
                                    }
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                )}
                              </div>
                              <FormControl>
                                <AccountSelect
                                  accounts={accountsData?.accounts ?? []}
                                  value={field.value}
                                  onValueChange={v => {
                                    field.onChange(v)
                                    form.setValue('cardId', undefined)
                                  }}
                                  disabled={isAccountFieldLocked}
                                  instanceKey={editingId ?? 'create'}
                                  className={stackySelectTrigger}
                                  itemClassName={stackySelectItem}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormItem className={cn(stackyDrawerFormItem, 'col-span-5')}>
                          <div className={stackyDrawerFormLabelSlot}>
                            <FormLabel>Vencimento</FormLabel>
                          </div>
                          <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                            {creditCardInvoiceLabel ?? '—'}
                          </div>
                        </FormItem>
                      </div>
                    ) : (
                      (!isAccountFieldLocked || !isCreditCardExpense) && (
                      <div className={stackyDrawerFormRow}>
                        {!isAccountFieldLocked && (
                        <FormField
                          control={form.control}
                          name="accountId"
                          render={({ field }) => (
                            <FormItem className={cn(stackyDrawerFormItem, 'col-span-12')}>
                              <div className={stackyDrawerLabelRow}>
                                <FormLabel>
                                  Conta <FormRequiredMark />
                                </FormLabel>
                                <button
                                  type="button"
                                  aria-label="Novo produto financeiro"
                                  className={stackyDrawerAddButton}
                                  onClick={() =>
                                    openAccountDrawer(id => form.setValue('accountId', id))
                                  }
                                >
                                  <Plus className="size-3" />
                                </button>
                              </div>
                              <FormControl>
                                <AccountSelect
                                  accounts={accountsData?.accounts ?? []}
                                  value={field.value}
                                  onValueChange={v => {
                                    field.onChange(v)
                                    form.setValue('cardId', undefined)
                                  }}
                                  paymentOnly={!isEdit || !isCreditCardExpense}
                                  instanceKey={editingId ?? 'create'}
                                  className={stackySelectTrigger}
                                  itemClassName={stackySelectItem}
                                />
                              </FormControl>
                              {!isEdit && paymentAccounts.length === 0 && (
                                <p className="mt-2 text-xs text-amber-700">
                                  Cadastre uma conta em{' '}
                                  <Link
                                    to="/$org/accounts"
                                    params={{ org: slug }}
                                    search={{ kind: 'accounts' }}
                                    className="font-medium underline"
                                    onClick={close}
                                  >
                                    Contas
                                  </Link>
                                  .
                                </p>
                              )}
                            </FormItem>
                          )}
                        />
                        )}
                        {!isCreditCardExpense && (
                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem className={cn(stackyDrawerFormItem, 'col-span-5')}>
                                <div className={stackyDrawerFormLabelSlot}>
                                  <FormLabel>Vencimento</FormLabel>
                                </div>
                                <FormControl>
                                  <DatePickerInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="dd/mm/aaaa"
                                    disabled={isBankFieldsLocked}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                        {!isCreditCardExpense && !isEdit && (
                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem className={cn(stackyDrawerFormItem, 'col-span-7')}>
                                <div className={stackyDrawerFormLabelSlot}>
                                  <FormLabel>Status</FormLabel>
                                </div>
                                <ToggleGroup
                                  type="single"
                                  value={field.value}
                                  onValueChange={v => {
                                    if (!v) return
                                    field.onChange(v)
                                  }}
                                  className={stackySegmentedControl}
                                >
                                  <ToggleGroupItem value="pending" className={stackySegmentItem}>
                                    Pendente
                                  </ToggleGroupItem>
                                  <ToggleGroupItem value="paid" className={stackySegmentItem}>
                                    {settledToggleLabel(settlementKind)}
                                  </ToggleGroupItem>
                                </ToggleGroup>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      )
                    )}

                    {isEdit && showPaymentFields && (
                      <div className={stackyDrawerFormRow}>
                        {installmentSettlementHintText && (
                          <p className="col-span-12 text-xs text-amber-700">
                            {installmentSettlementHintText}
                          </p>
                        )}
                        {underpaymentCarryHintText && (
                          <p className="col-span-12 text-xs text-amber-700">
                            {underpaymentCarryHintText}
                          </p>
                        )}
                        {hasInstallmentContext && !showAdvancePicker && (
                          <p className="col-span-12 text-xs text-slate-500">
                            {installmentSettlementScopeNote(
                              settlementKind,
                              tx?.installmentNumber ?? 1,
                              tx?.installmentsTotal ?? 1,
                              installmentRemainingReais
                            )}
                          </p>
                        )}
                        {showAdvancePicker && hasInstallmentContext && (
                          <div className="col-span-12">
                            <AdvanceInstallmentsPicker
                              installments={installmentSeriesData?.installments ?? []}
                              currentInstallmentNumber={tx?.installmentNumber ?? 1}
                              selectedIds={selectedAdvanceIds}
                              onSelectedIdsChange={setSelectedAdvanceIds}
                              paidAmountReais={paidAmountWatched ?? 0}
                              currentRemainingReais={installmentRemainingReais}
                              kind={settlementKind}
                            />
                          </div>
                        )}
                        <FormField
                          control={form.control}
                          name="paidAmount"
                          render={({ field }) => (
                            <FormItem className={cn(stackyDrawerFormItem, 'col-span-5')}>
                              <div className={stackyDrawerFormLabelSlot}>
                                <FormLabel>
                                  {amountToSettleLabel(settlementKind)} <FormRequiredMark />
                                </FormLabel>
                              </div>
                              <FormControl>
                                <CurrencyInput
                                  value={field.value ?? 0}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="paidAt"
                          render={({ field }) => (
                            <FormItem className={cn(stackyDrawerFormItem, 'col-span-7')}>
                              <div className={stackyDrawerFormLabelSlot}>
                                <FormLabel>
                                  {settlementDateLabel(settlementKind)} <FormRequiredMark />
                                </FormLabel>
                              </div>
                              <FormControl>
                                <DatePickerInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="dd/mm/aaaa"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {showCardField && (
                      <FormField
                        control={form.control}
                        name="cardId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cartão</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange} disabled={isImportedLocked}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o cartão" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {selectableCards.map(card => (
                                  <SelectItem key={card.id} value={card.id}>
                                    {card.label}
                                    {card.lastFourDigits ? ` · ${card.lastFourDigits}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}

                    {!isPay && !isTransfer && status === 'pending' && (
                      <TransactionRemindersSection
                        value={notifyState}
                        onChange={setNotifyState}
                        orgDefaults={orgNotifyDefaults}
                      />
                    )}

                    {showSplitDraft && (
                      <TransactionSplitsDraftSection
                        amountCents={reaisToCentsString(amount ?? 0)}
                        installmentsTotal={installmentsTotal}
                        recurrence={recurrence}
                        value={splitDraft}
                        onChange={setSplitDraft}
                      />
                    )}

                    {!isPay && (
                      <div className={stackyDrawerPanelMuted}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-800',
                            notesOpen && 'border-b border-slate-200'
                          )}
                          onClick={() => setNotesOpen(v => !v)}
                        >
                          <FileText className="size-4 shrink-0 text-slate-500" />
                          <span className="flex-1">Observações e Anexos</span>
                          <ChevronDown
                            className={cn(
                              'size-4 shrink-0 text-slate-500 transition-transform',
                              notesOpen && 'rotate-180'
                            )}
                          />
                        </button>
                        {notesOpen && (
                          <div className="space-y-4 bg-white p-4">
                            <FormField
                              control={form.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Observações..."
                                      rows={4}
                                      className="resize-none"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-700">Anexo</p>
                              <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.doc,.docx"
                                onChange={e => {
                                  const file = e.target.files?.[0]
                                  if (file) setPendingFiles(prev => [...prev, file])
                                  e.target.value = ''
                                }}
                              />
                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  className={stackyFilePickerButton}
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  Escolher arquivo
                                </button>
                                <span className="text-sm text-slate-500">
                                  {pendingFiles.length === 0 &&
                                  !(attachmentsData?.attachments?.length ?? 0)
                                    ? 'Nenhum arquivo escolhido'
                                    : [
                                        ...pendingFiles.map(f => f.name),
                                        ...(attachmentsData?.attachments?.map(a => a.fileName) ??
                                          []),
                                      ].join(', ')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                PDF, imagem, planilha ou documento — até 15 MB
                              </p>
                              {pendingFiles.map((file, i) => (
                                <div
                                  key={`${file.name}-${i}`}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                  <span className="truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setPendingFiles(prev => prev.filter((_, idx) => idx !== i))
                                    }
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              ))}
                              {attachmentsData?.attachments?.map(att => (
                                <div
                                  key={att.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                  <span className="truncate">{att.fileName}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (!slug || !editingId) return
                                      downloadTransactionAttachment(
                                        slug,
                                        editingId,
                                        att.id,
                                        att.fileName
                                      ).catch(() => toast.error('Erro ao baixar anexo'))
                                    }}
                                  >
                                    <Download className="size-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!isTransfer && !isEdit && (
                      <FormField
                        control={form.control}
                        name="recurrence"
                        render={({ field }) => (
                          <FormItem>
                            <div className={stackyRecurrencePanel}>
                              <p className="mb-3 text-sm font-medium text-gray-700">
                                Repetição do lançamento
                              </p>
                              <ToggleGroup
                                type="single"
                                value={field.value}
                                onValueChange={v => v && field.onChange(v)}
                                className={stackyRecurrenceSegmentedControl}
                              >
                                <ToggleGroupItem
                                  value="once"
                                  className={stackyRecurrenceSegmentItem}
                                >
                                  Única
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                  value="installment"
                                  className={stackyRecurrenceSegmentItem}
                                >
                                  Parcelada
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                  value="recurring"
                                  className={stackyRecurrenceSegmentItem}
                                >
                                  Recorrente
                                </ToggleGroupItem>
                              </ToggleGroup>

                              {field.value === 'installment' && (
                                <div className={cn(stackyDrawerFormRow, 'mt-4')}>
                                  <FormField
                                    control={form.control}
                                    name="periodicity"
                                    render={({ field: periodicityField }) => (
                                      <FormItem className={cn(stackyDrawerFormItem, 'col-span-7')}>
                                        <FormLabel>Periodicidade</FormLabel>
                                        <Select
                                          value={periodicityField.value}
                                          onValueChange={periodicityField.onChange}
                                        >
                                          <FormControl>
                                            <SelectTrigger className={stackySelectTrigger}>
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {TRANSACTION_PERIODICITY_OPTIONS.map(option => (
                                              <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className={stackySelectItem}
                                              >
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="installmentsTotal"
                                    render={({ field: installmentsField }) => (
                                      <FormItem className={cn(stackyDrawerFormItem, 'col-span-5')}>
                                        <FormLabel>Parcelas</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={2}
                                            className="bg-white"
                                            {...installmentsField}
                                            value={installmentsField.value ?? ''}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              )}

                              {field.value === 'installment' && installmentPreview && (
                                <InstallmentPreviewPanel items={installmentPreview} />
                              )}

                              {field.value === 'recurring' && (
                                <div className={cn(stackyDrawerFormRow, 'mt-4')}>
                                  <FormField
                                    control={form.control}
                                    name="counterparty"
                                    render={({ field: counterpartyField }) => (
                                      <FormItem className={cn(stackyDrawerFormItem, 'col-span-12')}>
                                        <FormLabel>Empresa / contraparte</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Ex: Empresa empregadora"
                                            {...counterpartyField}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="periodicity"
                                    render={({ field: periodicityField }) => (
                                      <FormItem className={cn(stackyDrawerFormItem, 'col-span-5')}>
                                        <FormLabel>Periodicidade</FormLabel>
                                        <Select
                                          value={periodicityField.value}
                                          onValueChange={periodicityField.onChange}
                                        >
                                          <FormControl>
                                            <SelectTrigger className={stackySelectTrigger}>
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {TRANSACTION_PERIODICITY_OPTIONS.map(option => (
                                              <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className={stackySelectItem}
                                              >
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="recurringDuration"
                                    render={({ field: durationField }) => (
                                      <FormItem className={cn(stackyDrawerFormItem, 'col-span-4')}>
                                        <FormLabel>Duração</FormLabel>
                                        <Select
                                          value={durationField.value}
                                          onValueChange={durationField.onChange}
                                        >
                                          <FormControl>
                                            <SelectTrigger className={stackySelectTrigger}>
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {RECURRING_DURATION_OPTIONS.map(option => (
                                              <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className={stackySelectItem}
                                              >
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                  {recurringDuration === 'times' && (
                                    <FormField
                                      control={form.control}
                                      name="recurringRepetitions"
                                      render={({ field: repetitionsField }) => (
                                        <FormItem className={cn(stackyDrawerFormItem, 'col-span-3')}>
                                          <FormLabel>Repetições</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              min={1}
                                              {...repetitionsField}
                                              value={repetitionsField.value ?? ''}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                  {recurringDuration === 'until' && (
                                    <FormField
                                      control={form.control}
                                      name="recurringEndDate"
                                      render={({ field: endDateField }) => (
                                        <FormItem className={cn(stackyDrawerFormItem, 'col-span-3')}>
                                          <FormLabel>Até</FormLabel>
                                          <FormControl>
                                            <DatePickerInput
                                              value={endDateField.value}
                                              onChange={endDateField.onChange}
                                              placeholder="dd/mm/aaaa"
                                              buttonClassName="bg-white"
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />
                    )}

                    {isEdit && editingId && !isTransfer && (
                      <TransactionSplitsSection
                        transactionId={editingId}
                        transactionAmount={
                          tx?.amount ?? optionalReaisToApiAmount(amount) ?? '0.00'
                        }
                        installmentsTotal={tx?.installmentsTotal}
                        installmentNumber={tx?.installmentNumber}
                        debtSummary={splitDebtSummary}
                        installmentSiblings={installmentSeriesData?.installments.map(item => ({
                          id: item.id,
                          amount: item.amount,
                        }))}
                      />
                    )}
                  </>
                )}
                </fieldset>
              </div>

              <DrawerFooter className={stackyDrawerFooter}>
                {(splitDebtSummary || !isPay) && (
                  <TransactionFooterSummary
                    splitDebtSummary={splitDebtSummary}
                    installmentSummary={installmentSummary}
                    amount={amount ?? 0}
                    status={displayStatus}
                    showStatus={!isTransfer && !isCreditCardExpense}
                    accountName={selectedAccount && !isTransfer ? selectedAccount.name : undefined}
                    installmentNumber={tx?.installmentNumber}
                    installmentsTotal={tx?.installmentsTotal}
                    isEdit={isEdit}
                  />
                )}
                <div className="flex gap-2">
                  {isEdit && deletable && !isPaidLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Excluir
                    </Button>
                  )}
                  <div className="ml-auto flex min-w-0 flex-1 justify-end gap-2">
                    {showFooterSettleButton && (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('shrink-0', stackySecondaryButton)}
                        disabled={isPending}
                        onClick={openSettlementFlow}
                      >
                        {registerSettlementButtonLabel(settlementKind, {
                          withSplits: needsReimbursementStep,
                        })}
                      </Button>
                    )}
                    {isPaidLocked ? (
                      <Button
                        type="button"
                        className={cn('shrink-0', stackyPrimaryButton)}
                        disabled={isPending}
                        onClick={() => setCancelPaymentDialogOpen(true)}
                      >
                        Cancelar {settlementKind === 'income' ? 'recebimento' : 'pagamento'}
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className={cn('min-w-0 flex-1 sm:flex-none sm:min-w-[10rem]', stackyPrimaryButton)}
                        disabled={isPending || (isPay && !canConfirmPay)}
                      >
                        {submitLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </DrawerFooter>
            </form>
          </Form>
        )}
      </DrawerContent>
      <AccountDrawer nested />
      <CategoryDrawer nested />
      <CardDrawer nested />
      <RecurringContractDrawer nested />
      <DeleteTransactionDialog
        transaction={
          tx
            ? {
                id: tx.id,
                title: tx.title,
                amount: tx.amount,
                transferPairId: tx.transferPairId,
              }
            : null
        }
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={close}
      />
      <AlertDialog open={cancelPaymentDialogOpen} onOpenChange={setCancelPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{cancelSettlementLabel(settlementKind)}?</AlertDialogTitle>
            <AlertDialogDescription>
              A transação voltará para pendente e você poderá editá-la novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelingPayment}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelingPayment}
              onClick={event => {
                event.preventDefault()
                void handleCancelPayment()
              }}
            >
              {cancelSettlementLabel(settlementKind)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={advancePromptOpen} onOpenChange={setAdvancePromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{advancePromptTitle(settlementKind)}</AlertDialogTitle>
            <AlertDialogDescription>
              {advancePromptDescription(settlementKind)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                toast.error(
                  `Valor excede o saldo da parcela (${formatCurrency(installmentRemainingReais)})`
                )
              }}
            >
              Não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowAdvancePicker(true)
                setSelectedAdvanceIds([])
                if (slug && editingId) {
                  void queryClient.invalidateQueries({
                    queryKey: getGetTransactionQueryKey(slug, editingId),
                  })
                  void queryClient.invalidateQueries({
                    queryKey: getGetSplitDebtSummaryQueryKey(slug, editingId),
                  })
                  void refetchInstallmentSeries()
                }
              }}
            >
              Sim, adiantar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PayInstallmentScopeDialog
        open={payScopeDialogOpen}
        onOpenChange={setPayScopeDialogOpen}
        kind={settlementKind}
        currentInstallmentNumber={tx?.installmentNumber ?? 1}
        installmentsTotal={tx?.installmentsTotal ?? 1}
        currentInstallmentAmountReais={installmentAmountReais}
        currentRemainingReais={installmentRemainingReais}
        installments={installmentSeriesData?.installments ?? []}
        unsettledSplits={
          needsReimbursementStep ? unsettledSplitItems : EMPTY_UNSETTLED_SPLITS
        }
        onConfirm={result => {
          void applyPayInstallmentScope(result)
        }}
      />
      <EditInstallmentDateScopeDialog
        open={dateScopeDialogOpen}
        onOpenChange={open => {
          setDateScopeDialogOpen(open)
          if (!open) pendingDateScopeSaveRef.current = null
        }}
        installmentNumber={tx?.installmentNumber ?? 1}
        installmentsTotal={tx?.installmentsTotal ?? 1}
        onConfirm={scope => {
          const save = pendingDateScopeSaveRef.current
          pendingDateScopeSaveRef.current = null
          if (!save) return
          void save(scope).catch(async error => {
            toast.error(await readHttpErrorMessage(error, 'Erro ao salvar lançamento'))
          })
        }}
      />
    </Drawer>
  )
}
