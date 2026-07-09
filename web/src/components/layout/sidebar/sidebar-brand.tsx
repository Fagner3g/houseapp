import { BarChart3 } from 'lucide-react'

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <BarChart3
        className="size-[22px] shrink-0 text-slate-900 group-data-[collapsible=icon]:size-5"
        strokeWidth={2.5}
      />
      <span className="text-[17px] font-bold tracking-tight text-slate-900 group-data-[collapsible=icon]:hidden">
        HouseApp
      </span>
    </div>
  )
}
