import { createHash } from 'node:crypto'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

/**
 * Stable across Nubank posting-date corrections.
 * Includes memo + amount because Nubank reuses the same FITID across distinct
 * STMTTRN rows (purchase + IOF, purchase + refund, etc.).
 */
export function buildOfxExternalId(fitId: string, memo: string, amount: string): string {
  return createHash('sha256')
    .update(`nubank-ofx|${fitId}|${memo}|${amount}`)
    .digest('hex')
}

/**
 * Previous stable format (FITID only). Ambiguous when Nubank reuses FITID.
 * Kept as an alternate so reimports can migrate rows created with that format.
 */
export function buildOfxFitIdOnlyExternalId(fitId: string): string {
  return createHash('sha256').update(`nubank-ofx|${fitId}`).digest('hex')
}

/**
 * Pre-stability format that included DTPOSTED.
 * Kept so reimports can match rows created before FITID-based ids.
 */
export function buildLegacyOfxExternalId(
  fitId: string,
  memo: string,
  amount: string,
  date: string
): string {
  return createHash('sha256').update(`${fitId}|${memo}|${amount}|${date}`).digest('hex')
}

/** Legacy hashes for the same FITID when the bank shifts DTPOSTED by a few days. */
export function buildLegacyOfxExternalIdsNearDate(
  fitId: string,
  memo: string,
  amount: string,
  date: string,
  dayWindow = 2
): string[] {
  const base = dayjs.utc(date)
  const ids: string[] = []

  for (let offset = -dayWindow; offset <= dayWindow; offset += 1) {
    ids.push(buildLegacyOfxExternalId(fitId, memo, amount, base.add(offset, 'day').toISOString()))
  }

  return ids
}

/** Alternates used to match rows imported under older external-id formats. */
export function buildOfxAlternateExternalIds(
  fitId: string,
  memo: string,
  amount: string,
  date: string,
  dayWindow = 2
): string[] {
  return [
    buildOfxFitIdOnlyExternalId(fitId),
    ...buildLegacyOfxExternalIdsNearDate(fitId, memo, amount, date, dayWindow),
  ]
}
