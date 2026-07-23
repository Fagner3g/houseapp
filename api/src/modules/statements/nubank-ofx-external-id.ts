import { createHash } from 'node:crypto'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

/** Stable across Nubank posting-date corrections (FITID does not change). */
export function buildOfxExternalId(fitId: string): string {
  return createHash('sha256').update(`nubank-ofx|${fitId}`).digest('hex')
}

/**
 * Pre-stability format that included DTPOSTED.
 * Kept so reimports can match rows created before FITID-only ids.
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
