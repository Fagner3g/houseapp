import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { parseNubankOfx } from './nubank-ofx-parser'
import { resolveOfxAccountForUpload } from './statement-ofx-account-resolution'

const PERSONAL_OFX_ID = '5f3318ca-72cd-4d70-9ed8-1d8534f5652c'
const EMPRESA_OFX_ID = '6a16f7a4-3292-47a1-9a85-69c6d2a5dbbd'

const personalFixture = join(__dirname, 'fixtures', 'Nubank_2026-04-08.ofx')

describe('resolveOfxAccountForUpload', () => {
  it('links the first OFX import when the account has no ofxAccountId yet', () => {
    const result = resolveOfxAccountForUpload(
      { id: 'acc-personal', name: 'Nubank', ofxAccountId: null },
      PERSONAL_OFX_ID,
      null
    )

    expect(result).toEqual({
      mode: 'existing',
      accountId: 'acc-personal',
      accountName: 'Nubank',
      linkOfxAccountId: true,
    })
  })

  it('rejects uploading the empresa OFX on the personal card account', () => {
    const result = resolveOfxAccountForUpload(
      { id: 'acc-personal', name: 'Nubank', ofxAccountId: PERSONAL_OFX_ID },
      EMPRESA_OFX_ID,
      {
        id: 'acc-empresa',
        name: 'Nubank Cartão',
        ofxAccountId: EMPRESA_OFX_ID,
      }
    )

    expect(result).toEqual({
      mode: 'mismatch',
      ofxAccountId: EMPRESA_OFX_ID,
      expectedAccountId: 'acc-empresa',
      expectedAccountName: 'Nubank Cartão',
      uploadedOnAccountId: 'acc-personal',
      uploadedOnAccountName: 'Nubank',
    })
  })

  it('rejects uploading the personal OFX on the empresa card account', () => {
    const result = resolveOfxAccountForUpload(
      { id: 'acc-empresa', name: 'Nubank Cartão', ofxAccountId: EMPRESA_OFX_ID },
      PERSONAL_OFX_ID,
      {
        id: 'acc-personal',
        name: 'Nubank',
        ofxAccountId: PERSONAL_OFX_ID,
      }
    )

    expect(result).toEqual({
      mode: 'mismatch',
      ofxAccountId: PERSONAL_OFX_ID,
      expectedAccountId: 'acc-personal',
      expectedAccountName: 'Nubank',
      uploadedOnAccountId: 'acc-empresa',
      uploadedOnAccountName: 'Nubank Cartão',
    })
  })

  it('links when target already has a different OFX id but caller handles unregistered cards', () => {
    const result = resolveOfxAccountForUpload(
      { id: 'acc-personal', name: 'Nubank', ofxAccountId: PERSONAL_OFX_ID },
      EMPRESA_OFX_ID,
      null
    )

    expect(result).toEqual({
      mode: 'existing',
      accountId: 'acc-personal',
      accountName: 'Nubank',
      linkOfxAccountId: false,
    })
  })
})

describe('Nubank OFX card identifiers', () => {
  it('reads different ACCTID values for personal and empresa exports', () => {
    const personal = parseNubankOfx({
      content: readFileSync(personalFixture, 'utf8'),
      fileName: 'Nubank_2026-04-08.ofx',
    })

    const empresa = parseNubankOfx({
      content: readFileSync(join(__dirname, 'fixtures', 'Nubank_empresa.ofx'), 'utf8'),
      fileName: 'Nubank_2026-07-08 - empresa.ofx',
    })

    expect(personal.ofxAccountId).toBe(PERSONAL_OFX_ID)
    expect(empresa.ofxAccountId).toBe(EMPRESA_OFX_ID)
    expect(personal.ofxAccountId).not.toBe(empresa.ofxAccountId)
  })
})
