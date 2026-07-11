import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  getListStatementsQueryKey,
  useImportStatement,
} from '@/api/generated/api'
import { invalidateTransactionQueries } from '@/features/transactions/lib/invalidate-transaction-queries'
import type { ImportStatementBody } from '@/api/generated/model'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { bulkReviewImport } from '@/lib/bulk-review-import'
import {
  hasStatementAccountResolution,
  parseStatementOfx,
  parseStatementOfxOrg,
  parseStatementXlsx,
  type ParseStatementFileResponse,
  type ParseStatementWithResolutionResponse,
} from '@/lib/parse-statement'
import { useImportStatementDraftStore } from '@/stores/import-statement-draft'
import { useQueryClient } from '@tanstack/react-query'

import {
  buildInitialReviewRows,
  buildItemsFromParsedTransactions,
  buildPostImportUpdates,
  type ImportReviewRowState,
  type ParsedTransactionReviewItem,
} from '../components/import-review-types'

type StatementFileKind = 'ofx' | 'xlsx'

function detectStatementFileKind(file: File): StatementFileKind | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.ofx')) return 'ofx'
  if (name.endsWith('.xlsx')) return 'xlsx'
  if (file.type === 'application/x-ofx' || file.type.includes('ofx')) return 'ofx'
  if (
    file.type.includes('spreadsheet') ||
    file.type.includes('excel') ||
    file.type.includes('officedocument')
  ) {
    return 'xlsx'
  }
  return null
}

function showParseSuccessToast(kind: StatementFileKind, result: ParseStatementFileResponse) {
  if (result.duplicate.mode === 'blocked') {
    toast.warning('Esta fatura já foi importada nesta conta')
    return
  }

  if (result.duplicate.mode === 'update') {
    toast.message(
      `Atualização detectada: ${result.duplicate.newTransactionsCount} novo(s), ${result.duplicate.duplicateTransactionsCount} já importado(s)`
    )
    return
  }

  toast.success(
    `Fatura interpretada: ${result.transactionsCount} transações, ${result.categorizedCount} categorizadas` +
      (result.splitsInferredCount > 0
        ? `, ${result.splitsInferredCount} com divisão sugerida`
        : '') +
      (kind === 'ofx' ? ' (OFX)' : ' (XLSX)')
  )

  if (result.cardMismatchWarning) {
    toast.warning(result.cardMismatchWarning)
  }
}

function initializeRowsForParse(result: ParseStatementFileResponse) {
  const items = buildItemsFromParsedTransactions(result.parsed.transactions)
  return buildInitialReviewRows(items)
}

export function useImportStatementFlow() {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [fileParsing, setFileParsing] = useState(false)
  const { mutateAsync: importStatement, isPending } = useImportStatement()

  const parseResult = useImportStatementDraftStore(s => s.parseResult)
  const context = useImportStatementDraftStore(s => s.context)
  const resolvedAccountId = useImportStatementDraftStore(s => s.resolvedAccountId)
  const accountSetupCompleted = useImportStatementDraftStore(s => s.accountSetupCompleted)
  const mismatchAccepted = useImportStatementDraftStore(s => s.mismatchAccepted)
  const rows = useImportStatementDraftStore(s => s.rows)
  const onImportedCallback = useImportStatementDraftStore(s => s.onImportedCallback)
  const onViewExistingStatementCallback = useImportStatementDraftStore(
    s => s.onViewExistingStatementCallback
  )
  const storeOrgSlug = useImportStatementDraftStore(s => s.orgSlug)
  const discardImportStatementDraft = useImportStatementDraftStore(s => s.discardImportStatementDraft)
  const discardParseDraft = useImportStatementDraftStore(s => s.discardParseDraft)
  const closeImportStatement = useImportStatementDraftStore(s => s.closeImportStatement)
  const setParseResult = useImportStatementDraftStore(s => s.setParseResult)
  const setResolvedAccountId = useImportStatementDraftStore(s => s.setResolvedAccountId)
  const setAccountSetupCompleted = useImportStatementDraftStore(s => s.setAccountSetupCompleted)
  const setMismatchAccepted = useImportStatementDraftStore(s => s.setMismatchAccepted)
  const setRows = useImportStatementDraftStore(s => s.setRows)
  const setOrgSlug = useImportStatementDraftStore(s => s.setOrgSlug)

  const initialAccountId = context.accountId
  const closingDay = context.closingDay
  const dueDay = context.dueDay
  const ofxOnly = initialAccountId == null

  useEffect(() => {
    if (!slug) return
    if (storeOrgSlug && storeOrgSlug !== slug) {
      discardImportStatementDraft()
    }
    setOrgSlug(slug)
  }, [slug, storeOrgSlug, discardImportStatementDraft, setOrgSlug])

  useEffect(() => {
    if (parseResult && Object.keys(rows).length === 0) {
      setRows(initializeRowsForParse(parseResult))
    }
  }, [parseResult, rows, setRows])

  const invalidateAfterImport = (accountId: string) => {
    const orgSlug = slug ?? ''
    queryClient.invalidateQueries({ queryKey: getListStatementsQueryKey(orgSlug, accountId) })
    void invalidateTransactionQueries(queryClient, orgSlug)
  }

  const finishFileImport = (
    accountId: string,
    result: { transactionsCreated: number; transactionsSkipped?: number },
    splitsCreated = 0
  ) => {
    toast.success(
      `${result.transactionsCreated} transações importadas` +
        (result.transactionsSkipped ? ` (${result.transactionsSkipped} ignoradas)` : '') +
        (splitsCreated > 0 ? ` · ${splitsCreated} divisão(ões)` : '')
    )
    invalidateAfterImport(accountId)
    discardImportStatementDraft()
    onImportedCallback?.(accountId)
  }

  const parsedFileKind: StatementFileKind | null = parseResult?.provider ?? null

  const accountResolution =
    parseResult && hasStatementAccountResolution(parseResult)
      ? parseResult.accountResolution
      : null

  const reviewAccountId =
    resolvedAccountId ??
    (accountResolution?.mode === 'existing' ? accountResolution.accountId : null) ??
    initialAccountId ??
    null

  const missingResolution =
    parseResult && !accountSetupCompleted && accountResolution?.mode === 'missing'
      ? accountResolution
      : null

  const mismatchResolution =
    parseResult && !mismatchAccepted && accountResolution?.mode === 'mismatch'
      ? accountResolution
      : null

  const showStatementReview =
    !!parseResult &&
    !!reviewAccountId &&
    (accountResolution?.mode !== 'missing' || accountSetupCompleted) &&
    (accountResolution?.mode !== 'mismatch' || mismatchAccepted)

  const handleAccountResolution = (result: ParseStatementWithResolutionResponse) => {
    if (result.accountResolution.mode === 'existing') {
      setResolvedAccountId(result.accountResolution.accountId)

      if (initialAccountId && initialAccountId !== result.accountResolution.accountId) {
        toast.message(
          `${result.provider === 'ofx' ? 'OFX' : 'XLSX'} vinculado à conta "${result.accountResolution.accountName}"`
        )
      }
    }
  }

  const applyParseResult = (result: ParseStatementFileResponse, kind: StatementFileKind) => {
    setParseResult(result)
    setRows(initializeRowsForParse(result))
    handleAccountResolution(result)
    if (result.accountResolution.mode === 'existing') {
      showParseSuccessToast(kind, result)
    }
  }

  const handleFileUpload = async (file: File) => {
    const kind = detectStatementFileKind(file)
    if (!kind) {
      toast.error('Formato não suportado. Use arquivos .ofx ou .xlsx')
      return
    }

    if (!slug) return

    if (ofxOnly && kind !== 'ofx') {
      toast.error('Cadastre o cartão importando um arquivo OFX do Nubank')
      return
    }

    if (kind === 'xlsx' && !initialAccountId) {
      toast.error('Selecione uma conta de cartão Itaú antes de importar o XLSX')
      return
    }

    discardParseDraft()
    setFileParsing(true)

    try {
      if (kind === 'ofx') {
        const result = initialAccountId
          ? await parseStatementOfx(slug, initialAccountId, file)
          : await parseStatementOfxOrg(slug, file)
        applyParseResult(result, kind)
      } else {
        const result = await parseStatementXlsx(slug, initialAccountId ?? '', file)
        applyParseResult(result, kind)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : kind === 'ofx'
            ? 'Erro ao interpretar OFX'
            : 'Erro ao interpretar XLSX'
      toast.error(message)
    } finally {
      setFileParsing(false)
    }
  }

  const handleFileImport = async (data: {
    parsedWithReview: ImportStatementBody
    rows: Record<string, ImportReviewRowState>
    items: ParsedTransactionReviewItem[]
  }) => {
    if (!slug || !parseResult || !reviewAccountId || parseResult.duplicate.mode === 'blocked') return

    try {
      const result = await importStatement({
        slug,
        accountId: reviewAccountId,
        data: data.parsedWithReview,
      })

      let splitsCreated = 0
      if (result.transactionIds?.length) {
        const updates = buildPostImportUpdates(data.items, data.rows, result.transactionIds)
        if (updates.length) {
          const reviewResult = await bulkReviewImport(slug, updates)
          splitsCreated = reviewResult.splitsCreated
        }
      }

      finishFileImport(reviewAccountId, result, splitsCreated)
    } catch {
      toast.error('Erro ao importar fatura interpretada')
    }
  }

  const handleViewExistingStatement = (params: { accountId: string; monthKey: string }) => {
    if (onViewExistingStatementCallback) {
      onViewExistingStatementCallback(params)
    } else if (slug) {
      navigate({
        to: '/$org/accounts/',
        params: { org: slug },
        search: { accountId: params.accountId, month: params.monthKey },
      })
    }
    closeImportStatement()
  }

  const acceptMismatch = () => {
    if (!mismatchResolution || !parseResult) return
    setResolvedAccountId(mismatchResolution.expectedAccountId)
    setMismatchAccepted(true)
    showParseSuccessToast(parsedFileKind ?? 'ofx', parseResult)
  }

  const completeAccountSetup = (accountId: string) => {
    if (!parseResult) return
    setResolvedAccountId(accountId)
    setAccountSetupCompleted(true)
    showParseSuccessToast(parsedFileKind ?? 'ofx', parseResult)
  }

  return {
    ofxOnly,
    fileParsing,
    isPending,
    parseResult,
    parsedFileKind,
    closingDay,
    dueDay,
    reviewAccountId,
    missingResolution,
    mismatchResolution,
    showStatementReview,
    rows,
    setRows,
    discardParseDraft,
    discardImportStatementDraft,
    handleFileUpload,
    handleFileImport,
    handleViewExistingStatement,
    acceptMismatch,
    completeAccountSetup,
  }
}
