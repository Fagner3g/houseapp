import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Building2,
  Coins,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { CSSProperties } from 'react'

import type { ListAccounts200AccountsItem } from '@/api/generated/model'

export const INSTITUTION_COLORS: Record<string, string> = {
  nubank: '#820AD1',
  itau: '#EC7000',
  bradesco: '#CC092F',
  santander: '#EC0000',
  bb: '#F8D117',
  caixa: '#005CA9',
  inter: '#FF7A00',
  c6: '#242424',
  xp: '#000000',
}

export const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  checking: '#2563EB',
  savings: '#0EA5E9',
  credit_card: '#475569',
  cash: '#059669',
  investment: '#D97706',
}

export const ACCOUNT_COLOR_PRESETS = [
  { value: '#820AD1', label: 'Roxo Nubank' },
  { value: '#EC7000', label: 'Laranja Itaú' },
  { value: '#CC092F', label: 'Vermelho Bradesco' },
  { value: '#EC0000', label: 'Vermelho Santander' },
  { value: '#F8D117', label: 'Amarelo BB' },
  { value: '#005CA9', label: 'Azul Caixa' },
  { value: '#FF7A00', label: 'Laranja Inter' },
  { value: '#242424', label: 'Preto C6' },
  { value: '#2563EB', label: 'Azul' },
  { value: '#059669', label: 'Verde' },
  { value: '#7C3AED', label: 'Roxo' },
  { value: '#64748B', label: 'Cinza' },
] as const

export const ACCOUNT_ICON_OPTIONS: {
  value: string
  label: string
  icon: LucideIcon
}[] = [
  { value: 'landmark', label: 'Banco', icon: Landmark },
  { value: 'credit-card', label: 'Cartão', icon: CreditCard },
  { value: 'wallet', label: 'Carteira', icon: Wallet },
  { value: 'trending-up', label: 'Investimento', icon: TrendingUp },
  { value: 'banknote', label: 'Dinheiro', icon: Banknote },
  { value: 'piggy-bank', label: 'Poupança', icon: PiggyBank },
  { value: 'building-2', label: 'Instituição', icon: Building2 },
  { value: 'coins', label: 'Moedas', icon: Coins },
]

const ACCOUNT_ICON_MAP = Object.fromEntries(
  ACCOUNT_ICON_OPTIONS.map(option => [option.value, option.icon])
) as Record<string, LucideIcon>

const DEFAULT_ICON_BY_TYPE: Record<string, string> = {
  checking: 'landmark',
  savings: 'piggy-bank',
  credit_card: 'credit-card',
  cash: 'wallet',
  investment: 'trending-up',
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim()
  if (normalized.length !== 6) return null

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  if ([r, g, b].some(channel => Number.isNaN(channel))) return null
  return { r, g, b }
}

export function isLightColor(color: string): boolean {
  const rgb = hexToRgb(color)
  if (!rgb) return true

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.62
}

export function institutionColor(institution: string | null | undefined): string | null {
  if (!institution) return null
  return INSTITUTION_COLORS[institution] ?? null
}

export function resolveAccountColor(account: {
  color?: string | null
  institution?: string | null
  type: string
}): string {
  if (account.color) return account.color
  return (
    institutionColor(account.institution) ??
    ACCOUNT_TYPE_COLORS[account.type] ??
    '#64748B'
  )
}

export function resolveAccountIconKey(account: {
  icon?: string | null
  type: string
}): string {
  if (account.icon && ACCOUNT_ICON_MAP[account.icon]) return account.icon
  return DEFAULT_ICON_BY_TYPE[account.type] ?? 'landmark'
}

export function resolveAccountIcon(account: {
  icon?: string | null
  type: string
}): LucideIcon {
  return ACCOUNT_ICON_MAP[resolveAccountIconKey(account)] ?? Landmark
}

export function defaultAccountColor(input: {
  institution?: string | null
  type: string
}): string {
  return resolveAccountColor({ institution: input.institution, type: input.type })
}

export function defaultAccountIconKey(type: string): string {
  return DEFAULT_ICON_BY_TYPE[type] ?? 'landmark'
}

export function accountCardStyle(
  account: ListAccounts200AccountsItem,
  selected: boolean
): CSSProperties {
  const color = resolveAccountColor(account)

  if (selected) {
    return {
      backgroundColor: color,
      borderColor: color,
    }
  }

  return {
    borderColor: `${color}55`,
    boxShadow: `inset 3px 0 0 ${color}`,
  }
}

export function accountCardTextClasses(color: string, selected: boolean) {
  const light = isLightColor(color)

  if (selected) {
    return {
      muted: light ? 'text-slate-700' : 'text-white/75',
      title: light ? 'text-slate-900' : 'text-white',
      value: light ? 'text-slate-900' : 'text-white',
      menu: light
        ? 'text-slate-600 hover:bg-black/10 hover:text-slate-900'
        : 'text-white/80 hover:bg-white/10 hover:text-white',
    }
  }

  return {
    muted: 'text-slate-500',
    title: 'text-slate-900',
    value: 'text-slate-900',
    menu: 'text-slate-400',
  }
}

export function primaryCardBrand(
  account: ListAccounts200AccountsItem
): string | null {
  const primary =
    account.cards?.find(card => card.status === 'active' && card.type === 'physical') ??
    account.cards?.find(card => card.status === 'active') ??
    account.cards?.[0]

  return primary?.brand ?? null
}
