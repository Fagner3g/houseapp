import {
  IconCalendarClock,
  IconCashRegister,
  IconCircleCheckFilled,
  IconDotsVertical,
} from '@tabler/icons-react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import { AlertOctagon, LucideClockFading, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import type { ListTransactions200TransactionsItem } from '@/http/generated/model'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDeleteTransactions } from '@/http/transactions'
import { DeleteRowAction } from '../delete-row'

export const useTable = (data: ListTransactions200TransactionsItem[]) => {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ Pagamento: false })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [editing, setEditing] = useState<ListTransactions200TransactionsItem | null>(null)
  const { slug } = useActiveOrganization()
  const { mutate: deleteTransactions } = useDeleteTransactions(slug)

  function copyLink(id: string) {
    const url = `${window.location.origin}/transactions?openId=${id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  const columns: ColumnDef<ListTransactions200TransactionsItem>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'Tipo',
      header: () => (
        <div>
          <IconCashRegister className="text-zinc-foreground" />
        </div>
      ),
      cell: ({ row }) => (
        <div>
          {row.original.type === 'expense' && <TrendingUp className="text-green-500" />}
          {row.original.type === 'income' && <TrendingDown className="text-red-600" />}
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Nome',
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="link"
          className="text-foreground w-fit px-0 text-left"
          onClick={() => row.table.options.meta?.editRow?.(row.original)}
        >
          {row.original.title}
        </Button>
      ),
    },
    {
      accessorKey: 'Status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="px-1.5 flex items-center gap-2">
          {row.original.status === 'paid' && (
            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
          )}
          {row.original.status === 'overdue' && (
            <>
              <AlertOctagon className="text-red-600" />
              <Label className="text-red-600 text-xs">
                Vencida
                {row.original.overdueDays > 0 && ` há ${row.original.overdueDays} dias`}
              </Label>
            </>
          )}
          {row.original.status === 'scheduled' && (
            <IconCalendarClock className="text-orange-500" />
          )}
          {row.original.status === undefined && (
            <LucideClockFading className="animate-spin text-gray-500" />
          )}
        </div>
      ),
    },
    {
      accessorKey: 'Preço',
      header: 'Valor',
      cell: ({ row }) => (
        <div>
          <Label className="text-muted-foreground px-1.5">{row.original.amount.toFixed(2)}</Label>
        </div>
      ),
    },

    {
      accessorKey: 'Vencimento',
      header: 'Vencimento',
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">
          {dayjs(row.original.dueDate).format('DD/MM/YYYY')}
        </Label>
      ),
    },
    {
      accessorKey: 'Pagamento',
      header: 'Pagamento',
      enableHiding: true,
      cell: ({ row }) => {
        return (
          <Label className="text-muted-foreground px-1.5">
            {row.original.paidAt ? dayjs(row.original.paidAt).format('DD/MM/YYYY') : ''}
          </Label>
        )
      },
    },
    {
      accessorKey: 'Para',
      header: 'Para',
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">{row.original.payTo}</Label>
      ),
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1 px-1.5">
          {row.original.tags?.map(tag => (
            <Badge key={tag.name} style={{ backgroundColor: tag.color }} className="text-white">
              #{tag.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'Recorrente',
      header: 'Recorrente',
      cell: ({ row }) => {
        return (
          <Label className="text-muted-foreground px-1.5">
            {row.original.isRecurring ? 'Sim' : 'Não'}
          </Label>
        )
      },
    },

    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => row.table.options.meta?.editRow?.(row.original)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyLink(row.original.id)}
            >
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success('Favoritado!')}>
              Favoritar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyLink(row.original.id)}>
              Copiar link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DeleteRowAction id={row.original.id} table={row.table} />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: row => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      deleteRows: (ids: string[]) => {
        deleteTransactions(ids)
      },
      editRow: (item: ListTransactions200TransactionsItem) => {
        setEditing(item)
      },
    },
  })

  return { table, columns, editing, setEditing }
}
