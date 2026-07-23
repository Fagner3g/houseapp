import { Download, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  downloadTransactionAttachment,
  fetchAttachmentBlob,
  resolveAttachmentPreviewKind,
  type AttachmentPreviewKind,
} from '@/lib/attachments'

export type AttachmentViewerTarget = {
  id: string
  fileName: string
  contentType: string
}

type AttachmentViewerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  transactionId: string
  attachment: AttachmentViewerTarget | null
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; objectUrl: string; kind: AttachmentPreviewKind }
  | { status: 'error' }

export function AttachmentViewerDialog({
  open,
  onOpenChange,
  slug,
  transactionId,
  attachment,
}: AttachmentViewerDialogProps) {
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!open || !attachment) {
      setState({ status: 'idle' })
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    setState({ status: 'loading' })

    void fetchAttachmentBlob(slug, transactionId, attachment.id)
      .then(blob => {
        const url = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setState({
          status: 'ready',
          objectUrl: url,
          kind: resolveAttachmentPreviewKind(attachment.contentType, attachment.fileName),
        })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, attachment, slug, transactionId])

  const handleDownload = async () => {
    if (!attachment) return
    setDownloading(true)
    try {
      await downloadTransactionAttachment(slug, transactionId, attachment.id, attachment.fileName)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,52rem)] w-[min(56rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-hidden p-4 sm:max-w-[min(56rem,calc(100vw-2rem))]">
        <DialogHeader className="shrink-0 space-y-1 pr-8">
          <DialogTitle className="truncate text-base">{attachment?.fileName ?? 'Anexo'}</DialogTitle>
          <DialogDescription className="sr-only">Visualização do anexo</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-slate-950/95">
          {state.status === 'loading' || state.status === 'idle' ? (
            <Loader2 className="size-8 animate-spin text-slate-300" />
          ) : state.status === 'error' ? (
            <p className="px-4 text-center text-sm text-slate-300">
              Não foi possível carregar o anexo.
            </p>
          ) : state.kind === 'image' ? (
            <img
              src={state.objectUrl}
              alt={attachment?.fileName ?? 'Anexo'}
              className="max-h-full max-w-full object-contain"
            />
          ) : state.kind === 'pdf' ? (
            <iframe
              title={attachment?.fileName ?? 'PDF'}
              src={state.objectUrl}
              className="h-full w-full rounded-md bg-white"
            />
          ) : (
            <div className="space-y-3 px-4 text-center">
              <p className="text-sm text-slate-300">
                Pré-visualização indisponível para este tipo de arquivo.
              </p>
              <Button type="button" variant="secondary" onClick={() => void handleDownload()}>
                Baixar arquivo
              </Button>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!attachment || downloading || state.status === 'loading'}
            onClick={() => void handleDownload()}
          >
            <Download className="size-4" />
            Baixar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
