import dayjs from 'dayjs'
import { create } from 'zustand'

const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD')
const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD')

interface TransactionListQueryStore {
  page: number
  perPage: number
  dateFrom: string
  dateTo: string
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
  setDateRange: (dateFrom: string, dateTo: string) => void
  resetPage: () => void
}

export const useTransactionListQueryStore = create<TransactionListQueryStore>(set => ({
  page: 1,
  perPage: 20,
  dateFrom: startOfMonth,
  dateTo: endOfMonth,
  setPage: page => set({ page }),
  setPerPage: perPage => set({ perPage, page: 1 }),
  setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo, page: 1 }),
  resetPage: () => set({ page: 1 }),
}))

export function getDefaultTransactionDateRange() {
  return {
    dateFrom: dayjs().startOf('month').format('YYYY-MM-DD'),
    dateTo: dayjs().endOf('month').format('YYYY-MM-DD'),
  }
}
