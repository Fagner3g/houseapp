import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { OutlineButton } from '@/components/ui/outline-button'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import {
  getGetPendingGoalsQueryKey,
  getGetWeekSummaryQueryKey,
  useCompleteGoal,
  useGetPendingGoals,
} from '@/http/generated/api'

export function PendingGoals() {
  const { slug } = useActiveOrganization()
  const { data, isLoading } = useGetPendingGoals(slug)
  const queryClient = useQueryClient()
  const { mutateAsync: completeGoal } = useCompleteGoal()
  if (isLoading || !data) {
    return null
  }

  async function handleCreateGoalCompletion(goalId: string) {
    await completeGoal({ data: { goalId } })

    queryClient.invalidateQueries({ queryKey: getGetPendingGoalsQueryKey(slug) })
    queryClient.invalidateQueries({ queryKey: getGetWeekSummaryQueryKey(slug) })
  }

  return (
    <div className="flex flex-wrap gap-3">
      {data.pendingGoals.map(goal => {
        return (
          <OutlineButton
            key={goal.id}
            onClick={() => handleCreateGoalCompletion(goal.id)}
            disabled={goal.completionCount >= goal.desiredWeekFrequency}
          >
            <Plus className="size-4 text-zinc-600" />
            {goal.title}
          </OutlineButton>
        )
      })}
    </div>
  )
}
