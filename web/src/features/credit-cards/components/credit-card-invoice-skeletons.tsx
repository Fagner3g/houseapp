import { Skeleton } from '@/components/ui/skeleton'

export function CreditCardDueBadgeSkeleton() {
  return <Skeleton className="h-6 w-28 rounded-full" />
}

export function CreditCardKpiSkeleton() {
  return (
    <div className="px-4 lg:px-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-50/40 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-48 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
              <div className="flex flex-wrap gap-3 pt-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-lg sm:w-36" />
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
          <Skeleton className="mb-3 h-3 w-24" />
          <div className="space-y-3">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="border-t border-dashed border-slate-200 pt-3">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CreditCardStatementFiltersSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-24 rounded-full" />
      ))}
    </div>
  )
}

export function CreditCardStatementTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="mx-4 overflow-hidden rounded-lg border border-slate-200/80 bg-white lg:mx-6">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="grid grid-cols-[2rem_1fr_1fr_5rem] gap-3 md:grid-cols-[2rem_6rem_1fr_6rem_5rem]">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="hidden h-4 w-20 md:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-[2rem_1fr_5rem] gap-3 px-4 py-3 md:grid-cols-[2rem_6rem_1fr_6rem_5rem]">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="hidden h-4 w-full max-w-xs md:block" />
            <Skeleton className="hidden h-4 w-20 md:block" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
