import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from './ui/button'

interface MonthYearSelectorProps {
  selectedYear: number
  selectedMonth: number
  onMonthYearChange: (year: number, month: number) => void
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function MonthYearSelector({
  selectedYear,
  selectedMonth,
  onMonthYearChange,
}: MonthYearSelectorProps) {
  const handlePrevious = () => {
    if (selectedMonth === 1) {
      onMonthYearChange(selectedYear - 1, 12)
    } else {
      onMonthYearChange(selectedYear, selectedMonth - 1)
    }
  }

  const handleNext = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    // Não permite avançar além do mês atual
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      return
    }

    if (selectedMonth === 12) {
      onMonthYearChange(selectedYear + 1, 1)
    } else {
      onMonthYearChange(selectedYear, selectedMonth + 1)
    }
  }

  const isCurrentMonth = () => {
    const today = new Date()
    return selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1
  }

  const goToCurrentMonth = () => {
    const today = new Date()
    onMonthYearChange(today.getFullYear(), today.getMonth() + 1)
  }

  return (
    <div className="flex w-full items-center gap-2 md:w-auto">
      <Button variant="outline" size="icon" onClick={handlePrevious}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex flex-1 items-center justify-center gap-2 md:flex-initial">
        <span className="text-center text-sm font-medium md:min-w-[140px]">
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </span>
        {!isCurrentMonth() && (
          <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="h-7 text-xs">
            Hoje
          </Button>
        )}
      </div>

      <Button variant="outline" size="icon" onClick={handleNext} disabled={isCurrentMonth()}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
