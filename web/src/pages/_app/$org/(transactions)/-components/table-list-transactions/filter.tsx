import { useNavigate, useSearch } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { ListFilterIcon, X } from 'lucide-react'
import { useId } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const { onlyMarked } = useSearch({ strict: false })

  const typeFilterId = useId()
  const responsibleFilterId = useId()
  const dateFromId = useId()
  const dateToId = useId()

  const defaultFrom = dayjs().startOf('month').format('YYYY-MM-DD')
  const defaultTo = dayjs().endOf('month').format('YYYY-MM-DD')
  const hasFilters =
    type !== 'all' || dateFrom !== defaultFrom || dateTo !== defaultTo || onlyMarked

  const clearFilters = () => {
    navigate({
      to: '.',
      search: {
        type: 'all',
        dateFrom: defaultFrom,
        dateTo: defaultTo,
        onlyMarked: false,
        page: 1,
      },
      replace: true,
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Filters" className="relative">
          <ListFilterIcon size={16} aria-hidden="true" />
          {hasFilters && (
            <span className="absolute -right-1 -top-1 block size-2 rounded-full bg-red-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] p-4 sm:w-96">
        <div className="space-y-4">
          {/* Header com título e botão limpar */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Filtros</h3>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Filtros organizados em grid */}
          <div className="grid grid-cols-1 gap-4">
            {/* Tipo de transação */}
            <div className="space-y-2">
              <Label htmlFor={typeFilterId} className="text-xs font-medium text-muted-foreground">
                Tipo de transação
              </Label>
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
                <SelectTrigger id={typeFilterId} className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as transações</SelectItem>
                  <SelectItem value="income">Apenas receitas</SelectItem>
                  <SelectItem value="expense">Apenas despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Responsável */}
            <div className="space-y-2">
              <Label
                htmlFor={responsibleFilterId}
                className="text-xs font-medium text-muted-foreground"
              >
                Responsável
              </Label>
              <Select
                value={onlyMarked ? 'marked' : 'all'}
                onValueChange={value => {
                  navigate({
                    to: '.',
                    search: prev => ({
                      ...prev,
                      onlyMarked: value === 'marked',
                      page: 1,
                    }),
                    replace: true,
                  })
                }}
              >
                <SelectTrigger id={responsibleFilterId} className="w-full">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as minhas transações</SelectItem>
                  <SelectItem value="marked">Apenas transações marcadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Período</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={dateFromId} className="text-xs text-muted-foreground">
                    De
                  </Label>
                  <Input
                    id={dateFromId}
                    type="date"
                    value={dateFrom}
                    onChange={e =>
                      navigate({
                        to: '.',
                        search: prev => ({ ...prev, dateFrom: e.target.value, page: 1 }),
                        replace: true,
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={dateToId} className="text-xs text-muted-foreground">
                    Até
                  </Label>
                  <Input
                    id={dateToId}
                    type="date"
                    value={dateTo}
                    onChange={e =>
                      navigate({
                        to: '.',
                        search: prev => ({ ...prev, dateTo: e.target.value, page: 1 }),
                        replace: true,
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
