import { eq } from 'drizzle-orm'

import { centavosToString } from '@/core/money'
import { db } from '@/db'
import { users } from '@/db/schemas/users'
import type { NotificationRepository } from '@/modules/alerts/notification.repository'

import { createChannelNotifications } from './notify-channels'
import type { SplitPaymentRequestRecord } from './repository'

function formatAmountLabel(amount: bigint): string {
  return (centavosToString(amount) ?? '0.00').replace('.', ',')
}

export async function notifySplitPaymentRequest(params: {
  notificationRepository: NotificationRepository
  request: SplitPaymentRequestRecord
  requesterName: string
  transactionTitle: string
  organizationName: string
}): Promise<void> {
  const { notificationRepository, request, requesterName, transactionTitle, organizationName } =
    params
  const amountLabel = formatAmountLabel(request.amount)

  await createChannelNotifications({
    notificationRepository,
    organizationId: request.organizationId,
    userId: request.recipientUserId,
    transactionId: request.transactionId,
    title: 'Confirmação de pagamento',
    body: `${requesterName} informou que já pagou R$ ${amountLabel} de "${transactionTitle}". Confirme no app.`,
    whatsappBody: [
      `${requesterName} pediu confirmação de pagamento.`,
      `Transação: ${transactionTitle}`,
      `Valor: R$ ${amountLabel}`,
      `Organização: ${organizationName}`,
      'Abra o app para confirmar ou recusar.',
    ].join('\n'),
    dedupeKeyPrefix: `split_payment_request:${request.id}`,
    metadata: {
      kind: 'split_payment_request',
      requestId: request.id,
      splitId: request.splitId,
      transactionId: request.transactionId,
      amount: centavosToString(request.amount) ?? '0.00',
      requesterName,
      transactionTitle,
      organizationName,
    },
  })
}

export async function notifySplitPaymentRequestResolved(params: {
  notificationRepository: NotificationRepository
  request: SplitPaymentRequestRecord
  decision: 'accepted' | 'rejected'
  creditorName: string
  transactionTitle: string
  organizationName: string
}): Promise<void> {
  const {
    notificationRepository,
    request,
    decision,
    creditorName,
    transactionTitle,
    organizationName,
  } = params
  const amountLabel = formatAmountLabel(request.amount)
  const accepted = decision === 'accepted'
  const kind = accepted ? 'split_payment_request_accepted' : 'split_payment_request_rejected'

  await createChannelNotifications({
    notificationRepository,
    organizationId: request.organizationId,
    userId: request.requestedByUserId,
    transactionId: request.transactionId,
    title: accepted ? 'Pagamento confirmado' : 'Pagamento não confirmado',
    body: accepted
      ? `${creditorName} confirmou o pagamento de R$ ${amountLabel} de "${transactionTitle}".`
      : `${creditorName} recusou a confirmação de R$ ${amountLabel} de "${transactionTitle}".`,
    whatsappBody: [
      accepted
        ? `${creditorName} confirmou o seu pagamento.`
        : `${creditorName} recusou a confirmação do pagamento.`,
      `Transação: ${transactionTitle}`,
      `Valor: R$ ${amountLabel}`,
      `Organização: ${organizationName}`,
    ].join('\n'),
    dedupeKeyPrefix: `${kind}:${request.id}`,
    metadata: {
      kind,
      requestId: request.id,
      splitId: request.splitId,
      transactionId: request.transactionId,
      amount: centavosToString(request.amount) ?? '0.00',
      creditorName,
      transactionTitle,
      organizationName,
      decision,
    },
  })
}

export async function loadUserName(userId: string): Promise<string> {
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return user?.name?.trim() || 'Membro'
}
