import { IconCashRegister, IconCircleCheckFilled, IconDotsVertical } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
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

import { getListTransactionsQueryKey, useDeleteTransactions } from '@/api/generated/api'
import type {
  ListTransactions200,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
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
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { DeleteRowAction } from '../delete-row'
import { DrawerEdit } from '../drawer-edit'

export const useTable = (data: ListTransactions200TransactionsItem[]) => {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    Pagamento: false,
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [editing, setEditing] = useState<ListTransactions200TransactionsItem | null>(null)
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { mutate: deleteTransactions } = useDeleteTransactions({
    mutation: {
      onMutate: async ({ slug, data }) => {
        await queryClient.cancelQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })
        const previous = queryClient.getQueryData<ListTransactions200>(
          getListTransactionsQueryKey(slug)
        )
        queryClient.setQueryData<ListTransactions200>(getListTransactionsQueryKey(slug), old => {
          if (!old) return old
          return {
            ...old,
            transactions: old.transactions.filter(t => !data.ids.includes(t.id)),
          }
        })
        return { previous, slug }
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(getListTransactionsQueryKey(ctx.slug), ctx.previous)
        }
        toast.error('Erro ao excluir transações')
      },
      onSuccess: () => {
        toast.success('Transações excluídas com sucesso!')
      },
      onSettled: (_data, _err, _vars, ctx) => {
        if (ctx) {
          queryClient.invalidateQueries({
            queryKey: getListTransactionsQueryKey(ctx.slug),
          })
        }
      },
    },
  })

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
          {row.original.type === 'expense' && <TrendingDown className="text-red-600" />}
          {row.original.type === 'income' && <TrendingUp className="text-green-500" />}
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Nome',
      enableHiding: false,
      cell: ({ row }) => {
        return <DrawerEdit item={row.original} />
      },
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
            <div className="flex items-center gap-1">
              <AlertOctagon className="text-red-400" />
              {row.original.overdueDays > 0 && (
                <span className="text-red-400">{row.original.overdueDays} dias</span>
              )}
              {row.original.overdueDays === 0 && <span className="text-red-400 text-xs">Hoje</span>}
            </div>
          )}
          {row.original.status === 'scheduled' && <LucideClockFading className="text-yellow-500" />}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Valor',
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">
          {Number(row.original.amount).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </Label>
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
      cell: ({ row, table }) => (
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
            <DropdownMenuItem onClick={() => table.options}>Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyLink(row.original.id)}>Duplicar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success('Favoritado!')}>
              Favoritar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyLink(row.original.id)}>
              Copiar link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DeleteRowAction id={row.original.id} table={table} />
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
        deleteTransactions({ slug, data: { ids } })
      },
      editRow: (item: ListTransactions200TransactionsItem) => {
        setEditing(item)
      },
    },
  })

  return { table, columns, editing, setEditing }
}
