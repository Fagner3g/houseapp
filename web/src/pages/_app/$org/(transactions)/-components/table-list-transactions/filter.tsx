import { useNavigate, useSearch } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { Check, ListFilterIcon, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
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

  const defaultFrom = dayjs().startOf('month').format('YYYY-MM-DD')
  const defaultTo = dayjs().endOf('month').format('YYYY-MM-DD')

  // Estados locais para os filtros
  const [localType, setLocalType] = useState(type)
  const [localOnlyMarked, setLocalOnlyMarked] = useState(onlyMarked)
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(() => {
    if (dateFrom && dateTo) {
      return { from: new Date(dateFrom), to: new Date(dateTo) }
    } else if (dateFrom) {
      return { from: new Date(dateFrom), to: undefined }
    }
    return undefined
  })

  const hasFilters =
    type !== 'all' || dateFrom !== defaultFrom || dateTo !== defaultTo || onlyMarked === true

  // Sincronizar estados locais com props
  useEffect(() => {
    setLocalType(type)
  }, [type])

  useEffect(() => {
    setLocalOnlyMarked(onlyMarked)
  }, [onlyMarked])

  useEffect(() => {
    if (dateFrom && dateTo) {
      setLocalDateRange({ from: new Date(dateFrom), to: new Date(dateTo) })
    } else if (dateFrom) {
      setLocalDateRange({ from: new Date(dateFrom), to: undefined })
    } else {
      setLocalDateRange(undefined)
    }
  }, [dateFrom, dateTo])

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setLocalDateRange(range)
  }

  const applyFilters = () => {
    const dateFrom = localDateRange?.from
      ? dayjs(localDateRange.from).format('YYYY-MM-DD')
      : defaultFrom
    const dateTo = localDateRange?.to ? dayjs(localDateRange.to).format('YYYY-MM-DD') : defaultTo

    const searchParams: {
      type: string
      dateFrom: string
      dateTo: string
      page: number
      onlyMarked?: boolean
    } = {
      type: localType,
      dateFrom,
      dateTo,
      page: 1,
    }

    // Só adiciona onlyMarked se for true
    if (localOnlyMarked) {
      searchParams.onlyMarked = true
    }

    navigate({
      to: '.',
      search: searchParams,
      replace: true,
    })
  }

  const clearFilters = () => {
    setLocalType('all')
    setLocalOnlyMarked(false)
    // Manter o range do mês atual
    setLocalDateRange({ from: new Date(defaultFrom), to: new Date(defaultTo) })

    navigate({
      to: '.',
      search: {
        type: 'all',
        dateFrom: defaultFrom,
        dateTo: defaultTo,
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
          {/* Header com título */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Filtros</h3>
          </div>

          {/* Filtros organizados em grid */}
          <div className="grid grid-cols-1 gap-4">
            {/* Tipo de transação */}
            <div className="space-y-2">
              <Label htmlFor={typeFilterId} className="text-xs font-medium text-muted-foreground">
                Tipo de transação
              </Label>
              <Select
                value={localType}
                onValueChange={(value = 'all') => {
                  setLocalType(value as typeof type)
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
                value={localOnlyMarked ? 'marked' : 'all'}
                onValueChange={value => {
                  setLocalOnlyMarked(value === 'marked')
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
              <DateRangePicker
                value={localDateRange}
                onChange={handleDateRangeChange}
                placeholder="Selecione o período"
                className="w-full"
                showFooter={true}
                onApply={range => {
                  setLocalDateRange(range)
                }}
                onApplyCurrentMonth={() => {
                  const now = new Date()
                  const currentMonthRange = {
                    from: new Date(now.getFullYear(), now.getMonth(), 1),
                    to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
                  }
                  setLocalDateRange(currentMonthRange)
                }}
              />
            </div>
          </div>

          {/* Footer com botões de ação */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
            <Button size="sm" onClick={applyFilters} className="h-8 px-3 text-xs">
              <Check className="h-3 w-3 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
