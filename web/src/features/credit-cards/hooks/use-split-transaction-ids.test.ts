import { describe, expect, it } from 'vitest'

import type { ListSplitTransactionIds200 } from '@/api/generated/model'

import { toSplitTransactionIdsResult } from './use-split-transaction-ids'

describe('toSplitTransactionIdsResult', () => {
  it('maps viewerShareTotals into viewerShareById', () => {
    const data: ListSplitTransactionIds200 = {
      transactionIds: ['tx-1'],
      fullyDelegated: [],
      partiallyDivided: [],
      splitPaidTotals: [],
      splitRemainingTotals: [],
      receivableRemainingTotals: [],
      viewerShareTotals: [
        { transactionId: 'tx-1', amount: '83.75', remainingAmount: '83.75' },
      ],
    }

    const result = toSplitTransactionIdsResult(data)
    expect(result.viewerShareById.get('tx-1')).toEqual({
      amount: 83.75,
      remainingAmount: 83.75,
    })
  })
})
