import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ImportReviewRowState } from '@/features/accounts/components/import-review-types'
import type { ParseStatementFileResponse } from '@/lib/parse-statement'

export type ImportStatementContext = {
  accountId?: string
  closingDay?: number
  dueDay?: number
  fileName?: string
}

type ViewExistingStatementParams = {
  accountId: string
  monthKey: string
}

type OpenImportStatementOptions = {
  context?: ImportStatementContext
  onImported?: (accountId: string) => void
  onViewExistingStatement?: (params: ViewExistingStatementParams) => void
}

type ImportStatementDraftStore = {
  orgSlug: string | null
  open: boolean
  parseResult: ParseStatementFileResponse | null
  resolvedAccountId: string | null
  accountSetupCompleted: boolean
  mismatchAccepted: boolean
  rows: Record<string, ImportReviewRowState>
  context: ImportStatementContext
  onImportedCallback: ((accountId: string) => void) | null
  onViewExistingStatementCallback: ((params: ViewExistingStatementParams) => void) | null
  openImportStatement: (options?: OpenImportStatementOptions) => void
  closeImportStatement: () => void
  discardImportStatementDraft: () => void
  discardParseDraft: () => void
  setParseResult: (result: ParseStatementFileResponse | null) => void
  setResolvedAccountId: (accountId: string | null) => void
  setAccountSetupCompleted: (completed: boolean) => void
  setMismatchAccepted: (accepted: boolean) => void
  setRows: (
    rows:
      | Record<string, ImportReviewRowState>
      | ((prev: Record<string, ImportReviewRowState>) => Record<string, ImportReviewRowState>)
  ) => void
  setOrgSlug: (slug: string | null) => void
}

const emptyContext = (): ImportStatementContext => ({})

const emptyDraft = () => ({
  parseResult: null as ParseStatementFileResponse | null,
  resolvedAccountId: null as string | null,
  accountSetupCompleted: false,
  mismatchAccepted: false,
  rows: {} as Record<string, ImportReviewRowState>,
  context: emptyContext(),
})

export const useImportStatementDraftStore = create<ImportStatementDraftStore>()(
  persist(
    set => ({
      orgSlug: null,
      open: false,
      ...emptyDraft(),
      onImportedCallback: null,
      onViewExistingStatementCallback: null,
      openImportStatement: options =>
        set(state => {
          const hasDraft = state.parseResult != null
          return {
            open: true,
            context: hasDraft ? state.context : (options?.context ?? state.context),
            onImportedCallback: options?.onImported ?? state.onImportedCallback,
            onViewExistingStatementCallback:
              options?.onViewExistingStatement ?? state.onViewExistingStatementCallback,
          }
        }),
      closeImportStatement: () => set({ open: false }),
      discardImportStatementDraft: () =>
        set({
          open: false,
          ...emptyDraft(),
          onImportedCallback: null,
          onViewExistingStatementCallback: null,
        }),
      discardParseDraft: () =>
        set(state => ({
          ...emptyDraft(),
          context: state.context,
          resolvedAccountId: state.context.accountId ?? null,
        })),
      setParseResult: parseResult => set({ parseResult }),
      setResolvedAccountId: resolvedAccountId => set({ resolvedAccountId }),
      setAccountSetupCompleted: accountSetupCompleted => set({ accountSetupCompleted }),
      setMismatchAccepted: mismatchAccepted => set({ mismatchAccepted }),
      setRows: rows =>
        set(state => ({
          rows: typeof rows === 'function' ? rows(state.rows) : rows,
        })),
      setOrgSlug: orgSlug => set({ orgSlug }),
    }),
    {
      name: 'import-statement-draft',
      storage: {
        getItem: name => {
          const value = sessionStorage.getItem(name)
          return value ? JSON.parse(value) : null
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: name => sessionStorage.removeItem(name),
      },
      partialize: state => ({
        orgSlug: state.orgSlug,
        open: state.open,
        parseResult: state.parseResult,
        resolvedAccountId: state.resolvedAccountId,
        accountSetupCompleted: state.accountSetupCompleted,
        mismatchAccepted: state.mismatchAccepted,
        rows: state.rows,
        context: state.context,
      }),
    }
  )
)

export const selectHasImportDraft = (state: ImportStatementDraftStore) =>
  state.parseResult != null

export const selectImportDraftFileName = (state: ImportStatementDraftStore) =>
  state.parseResult?.parsed.fileName ??
  state.context.fileName ??
  'fatura'
