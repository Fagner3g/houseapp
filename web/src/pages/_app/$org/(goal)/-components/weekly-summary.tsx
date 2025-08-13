import dayjs from 'dayjs'
import ptBR from 'dayjs/locale/pt-br'
import { CheckCircle2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DialogTrigger } from '@/components/ui/dialog'
import { Progress, ProgressIndicator } from '@/components/ui/progress-bar'
import { Separator } from '@/components/ui/separator'
import type { GetWeekSummary200Summary } from '@/http/generated/api'
import { PendingGoals } from './pending-goals'

dayjs.locale(ptBR)

interface WeeklySummaryProps {
  summary: GetWeekSummary200Summary
}

type Goal = { id: string; title: string; createdAt: string }

export function WeeklySummary({ summary }: WeeklySummaryProps) {
  const fromDate = dayjs().startOf('week').format('D[ de ]MMM')
  const toDate = dayjs().endOf('week').format('D[ de ]MMM')

  const completedPercentage = summary.total
    ? Math.round((summary.completed * 100) / summary.total)
    : 0

  return (
    <main className="max-w-[540px] py-10 px-5 mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">
            {fromDate} - {toDate}
          </span>
        </div>

        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="size-4" />
            Cadastrar meta
          </Button>
        </DialogTrigger>
      </div>

      <div className="flex flex-col gap-3">
        <Progress value={summary.completed} max={summary.total || 0}>
          <ProgressIndicator style={{ width: `${completedPercentage}%` }} />
        </Progress>

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>
            Você completou <span className="text-foreground">{summary.completed}</span> de{' '}
            <span className="text-foreground">{summary.total}</span> metas nessa semana.
          </span>
          <span>{completedPercentage}%</span>
        </div>
      </div>

      <Separator />

      <PendingGoals />

      <div className="space-y-6">
        <h2 className="text-xl font-medium">Sua semana</h2>

        {summary.goalsPerDay &&
          Object.entries(summary.goalsPerDay as Record<string, Goal[] | null>).map(
            ([date, goals]) => {
              const safeGoals: Goal[] = goals ?? []
              const weekDay = dayjs(date).format('dddd')
              const parsedDate = dayjs(date).format('D[ de ]MMM')

              return (
                <div className="space-y-4" key={date}>
                  <h3 className="font-medium capitalize">
                    {weekDay} <span className="text-zinc-400 text-xs">({parsedDate})</span>
                  </h3>

                  <ul className="space-y-3">
                    {safeGoals.map(goal => {
                      const parsedTime = dayjs(goal.createdAt).format('HH:mm[h]')

                      return (
                        <li className="flex items-center gap-2" key={goal.id}>
                          <CheckCircle2 className="size-4 text-pink-500" />
                          <span className="text-sm text-zinc-400">
                            Você completou "<span className="text-foreground">{goal.title}</span>"
                            às <span className="text-foreground">{parsedTime}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            }
          )}
      </div>
    </main>
  )
}
