import { describe, expect, it } from 'vitest'

import {
  buildLegacyOfxExternalId,
  buildLegacyOfxExternalIdsNearDate,
  buildOfxAlternateExternalIds,
  buildOfxExternalId,
  buildOfxFitIdOnlyExternalId,
} from './nubank-ofx-external-id'

describe('nubank-ofx-external-id', () => {
  const fitId = '6a522181-e8c8-4719-81fa-a26ae02c56a4'
  const memo = 'Google Youtubepremium'
  const amount = '26.90'

  it('keeps external id stable when posting date changes', () => {
    expect(buildOfxExternalId(fitId, memo, amount)).toBe(
      buildOfxExternalId(fitId, memo, amount)
    )
    expect(buildOfxExternalId(fitId, memo, amount)).toHaveLength(64)
  })

  it('disambiguates distinct STMTTRN rows that share a FITID', () => {
    const purchase = buildOfxExternalId(fitId, 'Pousada Estalagem da S - Parcela 1/3', '271.34')
    const refund = buildOfxExternalId(
      fitId,
      'Estorno de compra (Pousada Estalagem da S)',
      '271.34'
    )
    const iof = buildOfxExternalId(fitId, 'IOF de "Claude.Ai Subscription"', '3.91')

    expect(purchase).not.toBe(refund)
    expect(purchase).not.toBe(iof)
  })

  it('exposes FITID-only hash as an alternate for reimport migration', () => {
    const alternates = buildOfxAlternateExternalIds(
      fitId,
      memo,
      amount,
      '2026-07-12T12:00:00.000Z'
    )

    expect(alternates[0]).toBe(buildOfxFitIdOnlyExternalId(fitId))
    expect(alternates).toContain(
      buildLegacyOfxExternalId(fitId, memo, amount, '2026-07-11T12:00:00.000Z')
    )
  })

  it('changes legacy id when posting date changes', () => {
    const jul11 = buildLegacyOfxExternalId(
      fitId,
      memo,
      amount,
      '2026-07-11T12:00:00.000Z'
    )
    const jul12 = buildLegacyOfxExternalId(
      fitId,
      memo,
      amount,
      '2026-07-12T12:00:00.000Z'
    )

    expect(jul11).not.toBe(jul12)
    expect(jul11).toBe('4800ccffeea5d36db13fe01a2ab16f45dd9b978b430c4123451f737efa6b3c99')
    expect(jul12).toBe('8a5fd8d13e45ed4db1036930c2298588bec257bbbf8d30d1ec1978a13f131726')
  })

  it('includes nearby legacy ids so date drift still matches', () => {
    const near = buildLegacyOfxExternalIdsNearDate(
      fitId,
      memo,
      amount,
      '2026-07-12T12:00:00.000Z',
      2
    )

    expect(near).toContain('4800ccffeea5d36db13fe01a2ab16f45dd9b978b430c4123451f737efa6b3c99')
    expect(near).toContain('8a5fd8d13e45ed4db1036930c2298588bec257bbbf8d30d1ec1978a13f131726')
  })
})
