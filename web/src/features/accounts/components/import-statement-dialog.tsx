import { FileUp, Loader2, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  getListAccountsQueryKey,
  getListStatementsQueryKey,
  getListTransactionsQueryKey,
  useImportStatement,
} from '@/api/generated/api'
import type { ImportStatementBody } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { useQueryClient } from '@tanstack/react-query'

import { ImportOfxAccountSetup } from './import-ofx-account-setup'
import type { ImportReviewRowState, ParsedTransactionReviewItem } from './import-review-types'
import { buildPostImportUpdates } from './import-review-types'
import { ImportStatementPreview } from './import-statement-preview'

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

interface ImportStatementDialogProps {
  accountId?: string
  closingDay?: number
  dueDay?: number
  onImported?: (accountId: string) => void
  onViewExistingStatement?: (params: { accountId: string; monthKey: string }) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}

export function ImportStatementDialog({
  accountId: initialAccountId,
  closingDay,
  dueDay,
  onImported,
  onViewExistingStatement,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
}: ImportStatementDialogProps) {
  const ofxOnly = initialAccountId == null
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const [fileParsing, setFileParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseStatementFileResponse | null>(null)
  const [resolvedAccountId, setResolvedAccountId] = useState<string | null>(initialAccountId ?? null)
  const [accountSetupCompleted, setAccountSetupCompleted] = useState(false)
  const [mismatchAccepted, setMismatchAccepted] = useState(false)
  const { mutateAsync: importStatement, isPending } = useImportStatement()

  const resetFileState = () => {
    setParseResult(null)
    setFileParsing(false)
    setResolvedAccountId(initialAccountId ?? null)
    setAccountSetupCompleted(false)
    setMismatchAccepted(false)
  }

  const invalidateAfterImport = (accountId: string) => {
    const orgSlug = slug ?? ''
    queryClient.invalidateQueries({ queryKey: getListStatementsQueryKey(orgSlug, accountId) })
    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(orgSlug) })
    queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(orgSlug) })
  }

  const finishFileImport = (
    accountId: string,
    result: {
      transactionsCreated: number
      transactionsSkipped?: number
    },
    splitsCreated = 0
  ) => {
    toast.success(
      `${result.transactionsCreated} transações importadas` +
        (result.transactionsSkipped ? ` (${result.transactionsSkipped} ignoradas)` : '') +
        (splitsCreated > 0 ? ` · ${splitsCreated} divisão(ões)` : '')
    )
    invalidateAfterImport(accountId)
    setOpen(false)
    resetFileState()
    onImported?.(accountId)
  }

  const showParseSuccessToast = (kind: StatementFileKind, result: ParseStatementFileResponse) => {
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

  const parsedFileKind: StatementFileKind | null = parseResult?.provider ?? null

  const accountResolution = parseResult && hasStatementAccountResolution(parseResult)
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

    setFileParsing(true)
    setParseResult(null)
    setResolvedAccountId(initialAccountId ?? null)

    try {
      if (kind === 'ofx') {
        const result = initialAccountId
          ? await parseStatementOfx(slug, initialAccountId, file)
          : await parseStatementOfxOrg(slug, file)
        setParseResult(result)
        handleAccountResolution(result)
        if (result.accountResolution.mode === 'existing') {
          showParseSuccessToast(kind, result)
        }
      } else {
        const result = await parseStatementXlsx(slug, initialAccountId ?? '', file)
        setParseResult(result)
        handleAccountResolution(result)
        if (result.accountResolution.mode === 'existing') {
          showParseSuccessToast(kind, result)
        }
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

  const isWidePreview = showStatementReview

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        setOpen(value)
        if (!value) resetFileState()
      }}
    >
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button className="bg-slate-900">
            <Upload className="mr-2 size-4" />
            Importar fatura
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className={
          isWidePreview
            ? 'flex h-[95vh] max-h-[95vh] w-[min(96rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96rem,calc(100vw-2rem))]'
            : 'max-w-2xl'
        }
      >
        {mismatchResolution ? (
          <div className="space-y-6 p-6">
            <DialogHeader>
              <DialogTitle>
                {parsedFileKind === 'xlsx' ? 'XLSX de outro cartão' : 'OFX de outro cartão'}
              </DialogTitle>
              <DialogDescription>
                Este arquivo pertence ao cartão{' '}
                <span className="font-medium text-slate-900">
                  {mismatchResolution.expectedAccountName}
                </span>
                {mismatchResolution.cardLastFour ? (
                  <>
                    {' '}
                    (final {mismatchResolution.cardLastFour})
                  </>
                ) : null}
                , não ao cartão selecionado (
                <span className="font-medium text-slate-900">
                  {mismatchResolution.uploadedOnAccountName}
                </span>
                ).
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm text-slate-600">
              Deseja continuar a importação no cartão correto?
            </p>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={resetFileState}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => {
                  setResolvedAccountId(mismatchResolution.expectedAccountId)
                  setMismatchAccepted(true)
                  showParseSuccessToast(parsedFileKind ?? 'ofx', parseResult as ParseStatementFileResponse)
                }}
              >
                Importar em {mismatchResolution.expectedAccountName}
              </Button>
            </div>
          </div>
        ) : missingResolution ? (
          <div className="space-y-6 p-6">
            <DialogHeader>
              <DialogTitle>
                {missingResolution.uploadedOnAccountName
                  ? parsedFileKind === 'xlsx'
                    ? 'Cadastrar cartão do XLSX'
                    : 'Cadastrar cartão do OFX'
                  : 'Completar cadastro do cartão'}
              </DialogTitle>
              <DialogDescription>
                {missingResolution.uploadedOnAccountName ? (
                  <>
                    Este {parsedFileKind === 'xlsx' ? 'XLSX' : 'OFX'} não pertence ao cartão{' '}
                    <span className="font-medium text-slate-900">
                      {missingResolution.uploadedOnAccountName}
                    </span>
                    . Cadastre o cartão identificado no arquivo para continuar a importação.
                  </>
                ) : (
                  'Não foi possível criar a fatura automaticamente. Confirme os dados para continuar.'
                )}
              </DialogDescription>
            </DialogHeader>
            <ImportOfxAccountSetup
              resolution={missingResolution}
              importSource={parsedFileKind === 'xlsx' ? 'xlsx' : 'ofx'}
              onCancel={resetFileState}
              onCreated={accountId => {
                setResolvedAccountId(accountId)
                setAccountSetupCompleted(true)
                showParseSuccessToast(parsedFileKind ?? 'ofx', parseResult as ParseStatementFileResponse)
              }}
            />
          </div>
        ) : showStatementReview && parseResult ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 pb-4">
            <DialogHeader className="shrink-0 pb-4">
              <DialogTitle>Conferir fatura</DialogTitle>
            </DialogHeader>
            <ImportStatementPreview
              accountId={reviewAccountId ?? ''}
              closingDay={closingDay}
              dueDay={dueDay}
              parsed={parseResult.parsed}
              summary={parseResult.summary}
              duplicate={parseResult.duplicate}
              invoiceStatus={parseResult.invoiceStatus}
              provider={parseResult.provider}
              cardMismatchWarning={parseResult.cardMismatchWarning}
              isPending={isPending}
              onReset={resetFileState}
              onViewExistingStatement={params => {
                onViewExistingStatement?.(params)
                setOpen(false)
                resetFileState()
              }}
              onConfirm={data => void handleFileImport(data)}
            />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Importar fatura</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2 text-sm text-slate-500">
                {ofxOnly ? (
                  <p>
                    Exporte a fatura fechada em OFX pelo app Nubank. O cartão será cadastrado
                    automaticamente a partir do arquivo.
                  </p>
                ) : (
                  <>
                    <p>
                      Importe apenas faturas fechadas — exportações oficiais do banco com totais
                      confiáveis.
                    </p>
                    <ul className="list-inside list-disc space-y-1 pl-1">
                      <li>
                        <span className="font-medium text-slate-700">OFX</span> — Nubank, fatura
                        fechada
                      </li>
                      <li>
                        <span className="font-medium text-slate-700">XLSX</span> — Itaú, fatura
                        paga
                      </li>
                    </ul>
                  </>
                )}
              </div>

              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 p-8 hover:bg-slate-50">
                {fileParsing ? (
                  <Loader2 className="size-8 animate-spin text-violet-600" />
                ) : (
                  <FileUp className="size-8 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  {fileParsing
                    ? 'Interpretando arquivo...'
                    : ofxOnly
                      ? 'Selecionar arquivo OFX'
                      : 'Selecionar arquivo'}
                </span>
                <input
                  type="file"
                  accept={
                    ofxOnly
                      ? '.ofx,application/x-ofx'
                      : '.ofx,.xlsx,application/x-ofx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  }
                  className="hidden"
                  disabled={fileParsing || isPending}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) void handleFileUpload(file)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
