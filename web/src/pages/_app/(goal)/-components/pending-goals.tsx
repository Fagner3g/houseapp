import { Plus } from 'lucide-react'

import { OutlineButton } from '@/components/ui/outline-button'
import { useGetPendingGoals } from '@/http/generated/api'

export function PendingGoals() {
  const { data, isLoading } = useGetPendingGoals()

  if (isLoading || !data) {
    return null
  }

  async function handleCreateGoalCompletion(goalId: string) {
    // await createGoalCompletion({ goalId })
  }

  console.log('data', data)

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
