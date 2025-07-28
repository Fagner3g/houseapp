import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { CreateGoal } from '@/components/create-goal'
import { EmptyGoals } from '@/components/empty-goals'
import { Dialog } from '@/components/ui/dialog'
import { getSummary } from '@/http/get-summary'
import { WeeklySummary } from './-components/weekly-summary'

export const Route = createFileRoute('/_app/(goal)/goals')({
  component: Goals,
})

function Goals() {
  const { data, isLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: getSummary,
  })
  console.log('sumary', data?.summary)
  if (isLoading || !data) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="text-zinc-500 animate-spin size-10" />
      </div>
    )
  }
  return (
    <Dialog>
      {data.summary.total > 0 ? <WeeklySummary summary={data.summary} /> : <EmptyGoals />}
      <CreateGoal />
    </Dialog>
  )
}
