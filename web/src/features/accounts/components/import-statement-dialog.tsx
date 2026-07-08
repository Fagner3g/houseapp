import { FileUp, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useImportStatementFlow } from '@/features/accounts/hooks/use-import-statement-flow'
import { useImportStatementDraftStore } from '@/stores/import-statement-draft'

import { ImportOfxAccountSetup } from './import-ofx-account-setup'
import { ImportStatementPreview } from './import-statement-preview'

export function ImportStatementDialog() {
  const open = useImportStatementDraftStore(s => s.open)
  const closeImportStatement = useImportStatementDraftStore(s => s.closeImportStatement)
  const {
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
  } = useImportStatementFlow()

  const isWidePreview = showStatementReview

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) closeImportStatement()
      }}
    >
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
              <Button type="button" variant="outline" onClick={discardParseDraft}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-violet-600 hover:bg-violet-700"
                onClick={acceptMismatch}
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
              onCancel={discardParseDraft}
              onCreated={completeAccountSetup}
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
              rows={rows}
              onRowsChange={setRows}
              onReset={discardParseDraft}
              onDiscard={discardImportStatementDraft}
              onViewExistingStatement={handleViewExistingStatement}
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
