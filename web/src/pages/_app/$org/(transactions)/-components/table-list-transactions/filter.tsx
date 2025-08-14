import { useNavigate } from '@tanstack/react-router'
import { ListFilterIcon } from 'lucide-react'

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
import { useTransaction } from './hook/use-transaction'

export default function FilterTable() {
  const navigate = useNavigate()
  const { type, dateFrom, dateTo } = useTransaction()

  return (
    <div className="flex flex-col gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Filters">
            <ListFilterIcon size={16} aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3">
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>

            <Input
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
    </div>
  )
}
