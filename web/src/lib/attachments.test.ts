import { describe, expect, it } from 'vitest'

import { resolveAttachmentPreviewKind } from './attachments'

describe('resolveAttachmentPreviewKind', () => {
  it('detects images by content type or extension', () => {
    expect(resolveAttachmentPreviewKind('image/jpeg', 'foto.bin')).toBe('image')
    expect(resolveAttachmentPreviewKind('application/octet-stream', 'foto.png')).toBe('image')
  })

  it('detects pdfs by content type or extension', () => {
    expect(resolveAttachmentPreviewKind('application/pdf', 'doc.bin')).toBe('pdf')
    expect(resolveAttachmentPreviewKind('', 'recibo.PDF')).toBe('pdf')
  })

  it('falls back to other for office docs', () => {
    expect(
      resolveAttachmentPreviewKind(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'planilha.xlsx'
      )
    ).toBe('other')
  })
})
