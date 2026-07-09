import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.DB_PASSWORD = 'test'
  process.env.JWT_SECRET = 'test-secret'
  process.env.WEB_URL = 'http://localhost:3000'
})

import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { CardRepository } from '@/modules/cards/card.repository'
import type { CategoryRepository } from '@/modules/categories/category.repository'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'

import { parseItauXlsx } from './itau-xlsx'
import { StatementService } from './statement.service'

const fixturesDir = resolve(__dirname, 'fixtures')

describe('StatementService XLSX import', () => {
  it('maps parsed XLSX rows without requiring auxiliary virtual card suffixes', async () => {
    const service = new StatementService(
      {} as never,
      {} as AccountRepository,
      {} as CategoryRepository,
      {} as TransactionRepository,
      {} as CardRepository
    )

    const parsed = parseItauXlsx({
      buffer: readFileSync(resolve(fixturesDir, 'itau-fatura-paga-7735-maio2026.xlsx')),
      fileName: 'fatura-paga-final 7735-maio2026.xlsx',
      closingDay: 1,
      dueDay: 8,
    })

    const virtualCardRow = parsed.parsed.transactions.find(tx => tx.title.includes('Telos Emp Imob'))
    expect(virtualCardRow?.cardLastFour).toBeUndefined()

    const mapped = await (service as unknown as { mapTransactions(...args: unknown[]): unknown }).mapTransactions(
      'org-1',
      parsed.parsed.transactions,
      new Map([['7735', 'card-7735']])
    )

    expect(mapped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringContaining('Telos Emp Imob'),
          cardId: null,
        }),
      ])
    )
  })
})
