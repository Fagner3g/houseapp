import { useNavigate } from '@tanstack/react-router'
import { ListFilterIcon } from 'lucide-react'
import dayjs from 'dayjs'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface FilterTableProps {
  type: 'all' | 'income' | 'expense' | undefined
  dateFrom: string | undefined
  dateTo: string | undefined
}

export default function FilterTable({ type, dateFrom, dateTo }: FilterTableProps) {
  const navigate = useNavigate()

  const defaultFrom = dayjs().startOf('month').format('YYYY-MM-DD')
  const defaultTo = dayjs().endOf('month').format('YYYY-MM-DD')
  const hasFilters =
    type !== 'all' || dateFrom !== defaultFrom || dateTo !== defaultTo

  return (
    <Popover>
      <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Filters"
            className="relative"
          >
            <ListFilterIcon size={16} aria-hidden="true" />
            {hasFilters && (
              <span className="absolute -right-1 -top-1 block size-2 rounded-full bg-red-500" />
            )}
          </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] p-3 sm:w-80">
        <div className="flex flex-wrap items-end gap-2">
          <Select
            value={type}
            onValueChange={(value = 'all') => {
              navigate({
                to: '.',
                search: prev => ({ ...prev, type: value as typeof type, page: 1 }),
                replace: true,
              })
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Input
            className="sm:w-auto"
            type="date"
            value={dateFrom}
            onChange={e =>
              navigate({
                to: '.',
                search: prev => ({ ...prev, dateFrom: e.target.value, page: 1 }),
                replace: true,
              })
            }
          />

          <Input
            className="sm:w-auto"
            type="date"
            value={dateTo}
            onChange={e =>
              navigate({
                to: '.',
                search: prev => ({ ...prev, dateTo: e.target.value, page: 1 }),
                replace: true,
              })
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
