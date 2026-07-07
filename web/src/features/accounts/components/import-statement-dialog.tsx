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
  isParseStatementOfxResponse,
  parseStatementCsv,
  parseStatementOfx,
  parseStatementOfxOrg,
  parseStatementPdf,
  type ParseStatementFileResponse,
  type ParseStatementOfxResponse,
} from '@/lib/parse-statement-pdf'
import { useQueryClient } from '@tanstack/react-query'

import { ImportOfxAccountSetup } from './import-ofx-account-setup'
import type { ImportReviewRowState, ParsedTransactionReviewItem } from './import-review-types'
import { buildPostImportUpdates } from './import-review-types'
import { ImportStatementPreview } from './import-statement-preview'

type StatementFileKind = 'ofx' | 'csv' | 'pdf'

function detectStatementFileKind(file: File): StatementFileKind | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.ofx')) return 'ofx'
  if (name.endsWith('.csv')) return 'csv'
  if (name.endsWith('.pdf')) return 'pdf'
  if (file.type === 'application/x-ofx' || file.type.includes('ofx')) return 'ofx'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'text/csv') return 'csv'
  return null
}

interface ImportStatementDialogProps {
  accountId?: string
  onImported?: (accountId: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}

export function ImportStatementDialog({
  accountId: initialAccountId,
  onImported,
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
  const [ofxAccountCreated, setOfxAccountCreated] = useState(false)
  const [ofxMismatchAccepted, setOfxMismatchAccepted] = useState(false)
  const { mutateAsync: importStatement, isPending } = useImportStatement()

  const resetFileState = () => {
    setParseResult(null)
    setFileParsing(false)
    setResolvedAccountId(initialAccountId ?? null)
    setOfxAccountCreated(false)
    setOfxMismatchAccepted(false)
  }

  const invalidateAfterImport = (accountId: string) => {
    queryClient.invalidateQueries({ queryKey: getListStatementsQueryKey(slug!, accountId) })
    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(slug!) })
    queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug!) })
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
        (kind === 'ofx' ? ' (OFX)' : kind === 'pdf' ? ` (${result.provider})` : '')
    )

    if (kind === 'pdf') {
      toast.message('Importado via PDF. Para maior precisão na próxima, prefira OFX.')
    }
  }

  const ofxResolution =
    parseResult && isParseStatementOfxResponse(parseResult)
      ? parseResult.accountResolution
      : null

  const reviewAccountId =
    resolvedAccountId ??
    (ofxResolution?.mode === 'existing' ? ofxResolution.accountId : null) ??
    initialAccountId ??
    null

  const ofxMissingResolution =
    parseResult &&
    !ofxAccountCreated &&
    ofxResolution?.mode === 'missing'
      ? ofxResolution
      : null

  const ofxMismatchResolution =
    parseResult && !ofxMismatchAccepted && ofxResolution?.mode === 'mismatch'
      ? ofxResolution
      : null

  const showOfxReview =
    !!parseResult &&
    !!reviewAccountId &&
    (ofxResolution?.mode !== 'missing' || ofxAccountCreated) &&
    (ofxResolution?.mode !== 'mismatch' || ofxMismatchAccepted)

  const handleOfxResolution = (result: ParseStatementOfxResponse) => {
    if (result.accountResolution.mode === 'existing') {
      setResolvedAccountId(result.accountResolution.accountId)

      if (initialAccountId && initialAccountId !== result.accountResolution.accountId) {
        toast.message(
          `OFX vinculado à conta "${result.accountResolution.accountName}" (identificador Nubank)`
        )
      }
    }
  }

  const handleFileUpload = async (file: File) => {
    const kind = detectStatementFileKind(file)
    if (!kind) {
      toast.error('Formato não suportado. Use arquivos .ofx, .csv ou .pdf')
      return
    }

    if (!slug) return

    if (ofxOnly && kind !== 'ofx') {
      toast.error('Cadastre o cartão importando um arquivo OFX do Nubank')
      return
    }

    if ((kind === 'csv' || kind === 'pdf') && !initialAccountId) {
      toast.error('Selecione uma conta de cartão antes de importar CSV ou PDF')
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
        handleOfxResolution(result)
        if (result.accountResolution.mode === 'existing') {
          showParseSuccessToast(kind, result)
        }
      } else if (kind === 'csv') {
        const result = await parseStatementCsv(slug, initialAccountId!, file)
        setParseResult(result)
        showParseSuccessToast(kind, result)
      } else {
        const result = await parseStatementPdf(slug, initialAccountId!, file)
        setParseResult(result)
        showParseSuccessToast(kind, result)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : kind === 'ofx'
            ? 'Erro ao interpretar OFX'
            : kind === 'csv'
              ? 'Erro ao interpretar CSV'
              : 'Erro ao interpretar PDF'
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

  const isWidePreview = showOfxReview

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
        {ofxMismatchResolution ? (
          <div className="space-y-6 p-6">
            <DialogHeader>
              <DialogTitle>OFX de outro cartão</DialogTitle>
              <DialogDescription>
                Este arquivo pertence ao cartão{' '}
                <span className="font-medium text-slate-900">
                  {ofxMismatchResolution.expectedAccountName}
                </span>
                , não ao cartão selecionado (
                <span className="font-medium text-slate-900">
                  {ofxMismatchResolution.uploadedOnAccountName}
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
                  setResolvedAccountId(ofxMismatchResolution.expectedAccountId)
                  setOfxMismatchAccepted(true)
                  showParseSuccessToast('ofx', parseResult!)
                }}
              >
                Importar em {ofxMismatchResolution.expectedAccountName}
              </Button>
            </div>
          </div>
        ) : ofxMissingResolution ? (
          <div className="space-y-6 p-6">
            <DialogHeader>
              <DialogTitle>
                {ofxMissingResolution.uploadedOnAccountName
                  ? 'Cadastrar cartão do OFX'
                  : 'Completar cadastro do cartão'}
              </DialogTitle>
              <DialogDescription>
                {ofxMissingResolution.uploadedOnAccountName ? (
                  <>
                    Este OFX não pertence ao cartão{' '}
                    <span className="font-medium text-slate-900">
                      {ofxMissingResolution.uploadedOnAccountName}
                    </span>
                    . Cadastre o cartão identificado no arquivo para continuar a importação.
                  </>
                ) : (
                  'Não foi possível criar a fatura automaticamente. Confirme os dados para continuar.'
                )}
              </DialogDescription>
            </DialogHeader>
            <ImportOfxAccountSetup
              resolution={ofxMissingResolution}
              onCancel={resetFileState}
              onCreated={accountId => {
                setResolvedAccountId(accountId)
                setOfxAccountCreated(true)
                showParseSuccessToast('ofx', parseResult!)
              }}
            />
          </div>
        ) : showOfxReview && parseResult ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 pb-4">
            <DialogHeader className="shrink-0 pb-4">
              <DialogTitle>Conferir fatura</DialogTitle>
            </DialogHeader>
            <ImportStatementPreview
              accountId={reviewAccountId!}
              parsed={parseResult.parsed}
              summary={parseResult.summary}
              duplicate={parseResult.duplicate}
              invoiceStatus={parseResult.invoiceStatus}
              provider={parseResult.provider}
              isPending={isPending}
              onReset={resetFileState}
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
                      <span className="font-medium text-slate-700">Recomendado:</span> exporte a
                      fatura em OFX pelo app Nubank. Mais preciso, processado localmente e com
                      identificação estável das transações.
                    </p>
                    <ul className="list-inside list-disc space-y-1 pl-1">
                      <li>
                        <span className="font-medium text-slate-700">OFX</span> — fatura fechada
                        (recomendado)
                      </li>
                      <li>
                        <span className="font-medium text-slate-700">CSV</span> — ciclo em aberto
                      </li>
                      <li>
                        <span className="font-medium text-slate-700">PDF</span> — alternativa quando
                        não houver OFX
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
                      : '.ofx,.csv,.pdf,application/x-ofx,text/csv,application/pdf'
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
