export type XlsxAccountRef = {
  id: string
  name: string
}

export type XlsxCardOwner = {
  accountId: string
  accountName: string
}

export type XlsxAccountUploadResolution =
  | {
      mode: 'existing'
      accountId: string
      accountName: string
    }
  | {
      mode: 'mismatch'
      cardLastFour: string
      expectedAccountId: string
      expectedAccountName: string
      uploadedOnAccountId: string
      uploadedOnAccountName: string
    }
  | {
      mode: 'missing'
      cardLastFour: string
    }

export function resolveXlsxAccountForUpload(
  targetAccount: XlsxAccountRef,
  cardLastFour: string | null,
  cardOnTargetAccount: boolean,
  ownerByCard: XlsxCardOwner | null
): XlsxAccountUploadResolution {
  if (!cardLastFour || cardOnTargetAccount) {
    return {
      mode: 'existing',
      accountId: targetAccount.id,
      accountName: targetAccount.name,
    }
  }

  if (ownerByCard && ownerByCard.accountId !== targetAccount.id) {
    return {
      mode: 'mismatch',
      cardLastFour,
      expectedAccountId: ownerByCard.accountId,
      expectedAccountName: ownerByCard.accountName,
      uploadedOnAccountId: targetAccount.id,
      uploadedOnAccountName: targetAccount.name,
    }
  }

  return {
    mode: 'missing',
    cardLastFour,
  }
}
