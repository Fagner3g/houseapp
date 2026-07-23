import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { CheckCircle2, Circle } from 'lucide-react'

import { cn } from '@/lib/utils'

export function RadioGroup(props: RadioGroupPrimitive.RadioGroupProps) {
  return (
    <RadioGroupPrimitive.RadioGroup
      {...props}
      className={cn('flex flex-col gap-2', props.className)}
    />
  )
}

export function RadioGroupItem(props: RadioGroupPrimitive.RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.RadioGroupItem
      {...props}
      className={cn(
        'group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2.5 outline-none',
        'hover:border-zinc-300 hover:bg-zinc-50',
        'focus-visible:border-pink-500 focus-visible:ring-4 ring-pink-500/10',
        'data-[state=checked]:border-pink-500 data-[state=checked]:bg-pink-500/5',
        props.className,
      )}
    />
  )
}

export function RadioGroupIndicator() {
  return (
    <>
      <Circle className="size-4 text-zinc-400 group-data-[state=checked]:hidden" />
      <CheckCircle2 className="size-4 text-pink-500 hidden group-data-[state=checked]:inline" />
    </>
  )
}
