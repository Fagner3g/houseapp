import type { RowData } from '@tanstack/table-core'

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    deleteRows: (ids: string[]) => void
    editRow: (item: TData) => void
    duplicateRow: (item: TData) => void
    payRows: (ids: string[]) => Promise<void> | void
  }
}
