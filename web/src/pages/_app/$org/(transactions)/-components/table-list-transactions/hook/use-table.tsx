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
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  LucideClockFading,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
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
import { useIsMobile } from '@/hooks/use-mobile'
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
    // Visíveis por padrão: Tipo, title (Nome), status, amount (Valor), dueDate (Vencimento), tags
    // Ocultos por padrão, mas disponíveis no menu:
    paidAt: false,
    installmentsTotal: false,
    installmentsPaid: false,
    payTo: false,
    ownerName: false,
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: perPage,
  })
  const [editing, setEditing] = useState<ListTransactions200TransactionsItem | null>(null)
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const isMobile = useIsMobile()
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

  // Ajustar visibilidade das colunas para mobile
  useEffect(() => {
    if (isMobile) {
      setColumnVisibility(prev => ({
        ...prev,
        // Em mobile, mostrar apenas as colunas essenciais
        select: true,
        Tipo: true,
        title: true,
        status: true,
        amount: true,
        dueDate: false, // Ocultar vencimento em mobile
        tags: false, // Ocultar tags em mobile
        paidAt: false,
        installmentsTotal: false,
        installmentsPaid: false,
        payTo: false,
        ownerName: false,
        actions: true,
      }))
    } else {
      setColumnVisibility(prev => ({
        ...prev,
        // Em desktop, mostrar colunas padrão
        select: true,
        Tipo: true,
        title: true,
        status: true,
        amount: true,
        dueDate: true,
        tags: true,
        paidAt: false,
        installmentsTotal: false,
        installmentsPaid: false,
        payTo: false,
        ownerName: false,
        actions: true,
      }))
    }
  }, [isMobile])

  // Helper function to create sortable headers
  const createSortableHeader = (
    title: string,
    column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' }
  ) => {
    return (
      <Button
        variant="ghost"
        className="h-auto p-0 font-semibold hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {title}
        {column.getIsSorted() === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === 'desc' ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    )
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
          {(row.original.contextualizedType || row.original.type) === 'expense' && (
            <TrendingDown className="text-red-600" />
          )}
          {(row.original.contextualizedType || row.original.type) === 'income' && (
            <TrendingUp className="text-green-500" />
          )}
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: ({ column }) => createSortableHeader('Nome', column),
      enableHiding: false,
      enableSorting: true,
      sortingFn: 'alphanumeric',
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
      accessorKey: 'status',
      header: ({ column }) => createSortableHeader('Status', column),
      enableSorting: true,
      sortingFn: 'alphanumeric',
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
            {row.original.status === 'pending' &&
              row.original.overdueDays > 0 &&
              row.original.overdueDays <= 5 && (
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
            {row.original.status === 'pending' && row.original.overdueDays > 5 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="text-red-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Em atraso há {row.original.overdueDays} dias</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {row.original.status === 'pending' &&
              row.original.overdueDays === 0 &&
              daysUntilDue > 5 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <LucideClockFading className="text-gray-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vence em {daysUntilDue} dias</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            {row.original.status === 'pending' &&
              row.original.overdueDays === 0 &&
              daysUntilDue <= 5 && (
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
      header: ({ column }) => createSortableHeader('Valor', column),
      enableSorting: true,
      sortingFn: 'basic',
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
      accessorKey: 'dueDate',
      header: ({ column }) => createSortableHeader('Vencimento', column),
      enableSorting: true,
      sortingFn: 'datetime',
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">
          {dayjs(row.original.dueDate).format('DD/MM/YYYY')}
        </Label>
      ),
    },
    {
      accessorKey: 'paidAt',
      header: ({ column }) => createSortableHeader('Pagamento', column),
      enableHiding: true,
      enableSorting: true,
      sortingFn: 'datetime',
      cell: ({ row }) => {
        return (
          <Label className="text-muted-foreground px-1.5">
            {row.original.paidAt ? dayjs(row.original.paidAt).format('DD/MM/YYYY') : ''}
          </Label>
        )
      },
    },
    {
      accessorKey: 'installmentsTotal',
      header: ({ column }) => createSortableHeader('Parcelas', column),
      enableHiding: true,
      enableSorting: true,
      sortingFn: 'basic',
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">
          {row.original.installmentsTotal ?? ''}
        </Label>
      ),
    },
    {
      accessorKey: 'installmentsPaid',
      header: ({ column }) => createSortableHeader('Pagas', column),
      enableHiding: true,
      enableSorting: true,
      sortingFn: 'basic',
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">
          {row.original.installmentsPaid ?? ''}
        </Label>
      ),
    },
    {
      accessorKey: 'payTo',
      header: ({ column }) => createSortableHeader('Para', column),
      enableSorting: true,
      sortingFn: 'alphanumeric',
      cell: ({ row }) => (
        <Label className="text-muted-foreground px-1.5">
          {row.original.payTo.name || row.original.payTo.email}
        </Label>
      ),
    },
    {
      accessorKey: 'ownerName',
      header: ({ column }) => createSortableHeader('Responsável', column),
      enableSorting: true,
      sortingFn: 'alphanumeric',
      cell: ({ row }) => {
        return (
          <div className="px-1.5 flex items-center gap-2">
            <Label className="text-muted-foreground">{row.original.ownerName.split(' ')[0]}</Label>
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
      globalFilter,
      pagination,
    },
    getRowId: row => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
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
          await Promise.all(ids.map(id => payTransaction({ slug, id, data: {} })))
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
          // Pequeno delay para garantir que todas as transações foram processadas
          setTimeout(async () => {
            await queryClient.invalidateQueries({
              queryKey: getListTransactionsQueryKey(slug),
              refetchType: 'all',
            })

            // reports removed

            // Forçar refetch das queries para garantir atualização
            await queryClient.refetchQueries({
              queryKey: getListTransactionsQueryKey(slug),
            })
          }, 100)
        }
      },
    },
  })

  return { table, columns, editing, setEditing, globalFilter, setGlobalFilter, isMobile }
}
