import { describe, expect, it } from 'vitest'

import { resolveXlsxAccountForUpload } from './statement-xlsx-account-resolution'

describe('resolveXlsxAccountForUpload', () => {
  const target = { id: 'acc-4368', name: 'Itaú 4368' }

  it('keeps the selected account when the card last four matches', () => {
    const result = resolveXlsxAccountForUpload(target, '4368', true, null)

    expect(result).toEqual({
      mode: 'existing',
      accountId: 'acc-4368',
      accountName: 'Itaú 4368',
    })
  })

  it('routes to the registered account when the file belongs to another card', () => {
    const result = resolveXlsxAccountForUpload(target, '7735', false, {
      accountId: 'acc-7735',
      accountName: 'Itaú 7735',
    })

    expect(result).toEqual({
      mode: 'mismatch',
      cardLastFour: '7735',
      expectedAccountId: 'acc-7735',
      expectedAccountName: 'Itaú 7735',
      uploadedOnAccountId: 'acc-4368',
      uploadedOnAccountName: 'Itaú 4368',
    })
  })

  it('requires setup when the card is not registered anywhere', () => {
    const result = resolveXlsxAccountForUpload(target, '7735', false, null)

    expect(result).toEqual({
      mode: 'missing',
      cardLastFour: '7735',
    })
  })

  it('falls back to existing when the file has no card last four', () => {
    const result = resolveXlsxAccountForUpload(target, null, false, null)

    expect(result).toEqual({
      mode: 'existing',
      accountId: 'acc-4368',
      accountName: 'Itaú 4368',
    })
  })
})
