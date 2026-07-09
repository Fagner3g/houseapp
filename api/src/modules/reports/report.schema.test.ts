import { describe, expect, it } from 'vitest'

import { byCategoryReportSchema, topMerchantsReportSchema } from './report.schema'

describe('report query booleans', () => {
  it('parses personal=false from query string as false', () => {
    const parsed = byCategoryReportSchema.querystring.parse({
      type: 'expense',
      personal: 'false',
    })

    expect(parsed.personal).toBe(false)
  })

  it('parses personal=true from query string as true', () => {
    const parsed = topMerchantsReportSchema.querystring.parse({
      personal: 'true',
    })

    expect(parsed.personal).toBe(true)
  })

  it('defaults personal to false when omitted', () => {
    const parsed = topMerchantsReportSchema.querystring.parse({})

    expect(parsed.personal).toBe(false)
  })
})
