import { describe, expect, it } from 'vitest'

import { buildTransferTitle, isAutoTransferTitle } from './transfer-title'

describe('buildTransferTitle', () => {
  it('builds same-org title', () => {
    expect(
      buildTransferTitle({
        fromAccountName: 'Corrente',
        toAccountName: 'Poupança',
        isCrossOrg: false,
      })
    ).toBe('Transferência: Corrente → Poupança')
  })

  it('builds cross-org title', () => {
    expect(
      buildTransferTitle({
        fromOrgName: 'Empresa',
        toOrgName: 'Casa',
        fromAccountName: 'PJ',
        toAccountName: 'Nubank',
        isCrossOrg: true,
      })
    ).toBe('Transferência: Empresa/PJ → Casa/Nubank')
  })

  it('uses fallbacks when names are missing', () => {
    expect(buildTransferTitle({ isCrossOrg: false })).toBe('Transferência: Origem → Destino')
  })
})

describe('isAutoTransferTitle', () => {
  it('detects generated titles', () => {
    expect(isAutoTransferTitle('Transferência: A → B')).toBe(true)
    expect(isAutoTransferTitle('Salário')).toBe(false)
  })
})
