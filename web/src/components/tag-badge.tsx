import { XIcon } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'

type Props = {
  children: React.ReactNode
}

export default function TagBadge({ children }: Props) {
  const [badges, setBadges] = useState<string[]>([])

  if (!badges.length) return null

  return (
    <Badge variant="outline" className="gap-0 rounded-md px-2 py-1">
      {children}
      <button
        className="focus-visible:border-ring focus-visible:ring-ring/50 text-foreground/60 hover:text-foreground -my-[5px] -ms-0.5 -me-2 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[inherit] p-0 transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
        onClick={() => setBadges([])}
        aria-label="Delete"
        type="button"
      >
        <XIcon size={14} aria-hidden="true" />
      </button>
    </Badge>
  )
}
