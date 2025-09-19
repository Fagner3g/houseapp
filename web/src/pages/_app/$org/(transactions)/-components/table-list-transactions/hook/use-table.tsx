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
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  getListTransactionsQueryKey,
  useDeleteTransactions,
  usePayTransaction,
} from '@/api/generated/api'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useAuthStore } from '@/stores/auth'
import { DeleteRowAction } from '../delete-row'
import { PayRowAction } from '../pay-row'

export const useTable = (
  data: ListTransactions200TransactionsItem[],
  perPage: number,
  onDuplicate?: (item: ListTransactions200TransactionsItem) => void
) => {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    Pagamento: false,
    Parcelas: false,
    Pagas: false,
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: perPage,
  })
  const [editing, setEditing] = useState<ListTransactions200TransactionsItem | null>(null)
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
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

  const { mutateAsync: payTransaction } = usePayTransaction()

  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: perPage })
  }, [perPage])

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
      cell: ({ row, table }) => (
        <Button
          variant="link"
          className="w-fit px-0 text-left text-foreground"
          onClick={() => table.options.meta?.editRow(row.original)}
        >
          {row.original.title}
        </Button>
      ),
    },
    {
      accessorKey: 'Status',
      header: 'Status',
      cell: ({ row }) => {
        const today = new Date()
        const dueDate = new Date(row.original.dueDate)
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        return (
          <div className="px-1.5 flex items-center gap-2">
            {row.original.status === 'paid' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Transação paga</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {row.original.status === 'pending' && row.original.overdueDays > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertOctagon className="text-red-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Em atraso há {row.original.overdueDays} dias</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {row.original.status === 'pending' && row.original.overdueDays === 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <LucideClockFading className="text-yellow-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {daysUntilDue === 0
                        ? 'Vence hoje'
                        : daysUntilDue === 1
                          ? 'Vence amanhã'
                          : daysUntilDue > 0
                            ? `Vence em ${daysUntilDue} dias`
                            : 'Vencida'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {row.original.status === 'canceled' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertOctagon className="text-zinc-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Transação cancelada</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )
      },
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
      accessorKey: 'Parcelas',
      header: 'Parcelas',
      enableHiding: true,
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">
          {row.original.installmentsTotal ?? ''}
        </Label>
      ),
    },
    {
      accessorKey: 'Pagas',
      header: 'Pagas',
      enableHiding: true,
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">
          {row.original.installmentsPaid ?? ''}
        </Label>
      ),
    },
    {
      accessorKey: 'Para',
      header: 'Para',
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">{row.original.payTo}</Label>
      ),
    },
    {
      accessorKey: 'Responsável',
      header: 'Responsável',
      cell: ({ row }) => {
        const isOwner = row.original.ownerId === row.original.payToId
        const isCurrentUserOwner = currentUser?.id === row.original.ownerId

        return (
          <div className="px-1.5 flex items-center gap-2">
            <Label className="text-muted-foreground">{row.original.ownerName}</Label>
            {isOwner && (
              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded">
                Owner
              </span>
            )}
            {!isCurrentUserOwner && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-lg cursor-help hover:opacity-70 transition-opacity"
                      aria-label={`Criado por: ${row.original.ownerName}`}
                    >
                      👤
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Criado por: {row.original.ownerName}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )
      },
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
            <DropdownMenuItem onClick={() => table.options.meta?.editRow(row.original)}>
              {currentUser?.id === row.original.ownerId ? 'Editar' : 'Visualizar'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => table.options.meta?.duplicateRow(row.original)}>
              Duplicar
            </DropdownMenuItem>
            {currentUser?.id === row.original.ownerId && (
              <>
                <PayRowAction id={row.original.id} status={row.original.status} table={table} />
                <DropdownMenuSeparator />
                <DeleteRowAction id={row.original.id} table={table} />
              </>
            )}
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
        // Allow viewing for all users, editing only for owners
        setEditing(item)
      },
      duplicateRow: (item: ListTransactions200TransactionsItem) => {
        onDuplicate?.(item)
      },
      payRows: async (ids: string[]) => {
        const items = data.filter(t => ids.includes(t.id))
        const allPaid = items.every(t => t.status === 'paid')

        try {
          await Promise.all(ids.map(id => payTransaction({ slug, id })))
          toast.success(
            ids.length > 1
              ? allPaid
                ? 'Pagamentos cancelados com sucesso!'
                : 'Transações pagas com sucesso!'
              : allPaid
                ? 'Pagamento cancelado com sucesso!'
                : 'Transação paga com sucesso!'
          )
        } catch {
          toast.error(allPaid ? 'Erro ao cancelar pagamento' : 'Erro ao pagar transações')
        } finally {
          queryClient.invalidateQueries({
            queryKey: getListTransactionsQueryKey(slug),
          })
        }
      },
    },
  })

  return { table, columns, editing, setEditing }
}
