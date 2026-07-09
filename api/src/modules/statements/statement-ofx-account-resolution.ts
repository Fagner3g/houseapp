export type OfxAccountRef = {
  id: string
  name: string
  ofxAccountId: string | null
}

export type OfxAccountUploadResolution =
  | {
      mode: 'existing'
      accountId: string
      accountName: string
      linkOfxAccountId: boolean
    }
  | {
      mode: 'mismatch'
      ofxAccountId: string
      expectedAccountId: string
      expectedAccountName: string
      uploadedOnAccountId: string
      uploadedOnAccountName: string
    }

export function resolveOfxAccountForUpload(
  targetAccount: OfxAccountRef,
  ofxAccountId: string,
  ownerByOfx: OfxAccountRef | null
): OfxAccountUploadResolution {
  if (ownerByOfx && ownerByOfx.id !== targetAccount.id) {
    return {
      mode: 'mismatch',
      ofxAccountId,
      expectedAccountId: ownerByOfx.id,
      expectedAccountName: ownerByOfx.name,
      uploadedOnAccountId: targetAccount.id,
      uploadedOnAccountName: targetAccount.name,
    }
  }

  return {
    mode: 'existing',
    accountId: targetAccount.id,
    accountName: targetAccount.name,
    linkOfxAccountId: !targetAccount.ofxAccountId,
  }
}
