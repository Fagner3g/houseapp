import { getAuthToken } from '@/lib/auth'
import { env } from '@/lib/env'

export async function uploadTransactionAttachment(
  slug: string,
  transactionId: string,
  file: File
): Promise<void> {
  const token = getAuthToken()
  const url = new URL(
    `/organizations/${slug}/transactions/${transactionId}/attachments`,
    env.VITE_API_HOST
  )

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`)
  }
}

export function getAttachmentDownloadUrl(
  slug: string,
  transactionId: string,
  attachmentId: string
): string {
  return new URL(
    `/organizations/${slug}/transactions/${transactionId}/attachments/${attachmentId}/download`,
    env.VITE_API_HOST
  ).toString()
}

export async function downloadTransactionAttachment(
  slug: string,
  transactionId: string,
  attachmentId: string,
  fileName: string
): Promise<void> {
  const token = getAuthToken()
  const url = getAttachmentDownloadUrl(slug, transactionId, attachmentId)
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
