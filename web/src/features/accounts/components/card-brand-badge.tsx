import { cn } from '@/lib/utils'

import { cardBrandLabel } from '../constants'

interface CardBrandBadgeProps {
  brand: string | null | undefined
  className?: string
  compact?: boolean
}

function VisaMark({ compact }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 16"
      aria-hidden
      className={cn(compact ? 'h-2.5 w-8' : 'h-3 w-10')}
    >
      <text
        x="0"
        y="12"
        fill="#1A1F71"
        fontSize="13"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
      >
        VISA
      </text>
    </svg>
  )
}

function MastercardMark({ compact }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 28 18"
      aria-hidden
      className={cn(compact ? 'h-3.5 w-6' : 'h-4 w-7')}
    >
      <circle cx="10" cy="9" r="7" fill="#EB001B" />
      <circle cx="18" cy="9" r="7" fill="#F79E1B" fillOpacity="0.95" />
    </svg>
  )
}

function EloMark({ compact }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 34 14"
      aria-hidden
      className={cn(compact ? 'h-2.5 w-7' : 'h-3 w-8')}
    >
      <text
        x="0"
        y="11"
        fill="#00A4E0"
        fontSize="12"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
      >
        elo
      </text>
    </svg>
  )
}

function AmexMark({ compact }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 44 14"
      aria-hidden
      className={cn(compact ? 'h-2.5 w-8' : 'h-3 w-10')}
    >
      <rect width="44" height="14" rx="2" fill="#2E77BC" />
      <text
        x="4"
        y="10.5"
        fill="white"
        fontSize="8"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
      >
        AMEX
      </text>
    </svg>
  )
}

export function CardBrandBadge({ brand, className, compact }: CardBrandBadgeProps) {
  if (!brand) return null

  const label = cardBrandLabel(brand) ?? brand

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded bg-white/90 px-1.5 py-0.5 shadow-sm ring-1 ring-black/5',
        className
      )}
      title={label}
      aria-label={label}
    >
      {brand === 'visa' && <VisaMark compact={compact} />}
      {brand === 'mastercard' && <MastercardMark compact={compact} />}
      {brand === 'elo' && <EloMark compact={compact} />}
      {brand === 'amex' && <AmexMark compact={compact} />}
      {!['visa', 'mastercard', 'elo', 'amex'].includes(brand) && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
          {label}
        </span>
      )}
    </span>
  )
}
