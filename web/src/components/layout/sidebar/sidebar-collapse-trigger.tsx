import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useSidebar } from '@/components/ui/sidebar'

export function SidebarCollapseTrigger() {
  const { toggleSidebar, state } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={collapsed ? 'Expandir menu' : 'Minimizar menu'}
      className="absolute -left-3.5 top-6 z-20 hidden size-6 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#9ca3af] shadow-sm transition-colors hover:border-[#d1d5db] hover:text-[#6b7280] md:flex"
    >
      {collapsed ? (
        <ChevronRight className="size-3.5" strokeWidth={2.25} />
      ) : (
        <ChevronLeft className="size-3.5" strokeWidth={2.25} />
      )}
    </button>
  )
}
