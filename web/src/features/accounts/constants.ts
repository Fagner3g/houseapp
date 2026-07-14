import {
  Banknote,
  CreditCard,
  Landmark,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { CreateAccountBodyType } from '@/api/generated/model'

export const INSTITUTION_OTHER = '__other__'

export const INSTITUTIONS = [
  { value: 'nubank', label: 'Nubank' },
  { value: 'itau', label: 'Itaú' },
  { value: 'bradesco', label: 'Bradesco' },
  { value: 'santander', label: 'Santander' },
  { value: 'bb', label: 'Banco do Brasil' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'inter', label: 'Inter' },
  { value: 'c6', label: 'C6 Bank' },
  { value: 'xp', label: 'XP' },
  { value: INSTITUTION_OTHER, label: 'Outro' },
] as const

export const ACCOUNT_TYPES: {
  type: CreateAccountBodyType
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    type: 'checking',
    label: 'Conta bancária',
    description: 'Corrente, Pix, débito',
    icon: Landmark,
  },
  {
    type: 'credit_card',
    label: 'Fatura de cartão',
    description: 'Limite, fechamento e vencimento',
    icon: CreditCard,
  },
  { type: 'cash', label: 'Carteira física', description: 'Dinheiro vivo', icon: Wallet },
  { type: 'investment', label: 'Investimento', description: 'Nu Invest, CDB, ações', icon: TrendingUp },
]

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Cartões de crédito',
  checking: 'Contas bancárias',
  savings: 'Poupança',
  cash: 'Dinheiro',
  investment: 'Investimentos',
}

export const ACCOUNT_TYPE_SINGULAR: Record<string, string> = {
  credit_card: 'Fatura de cartão',
  checking: 'Conta bancária',
  savings: 'Poupança',
  cash: 'Carteira física',
  investment: 'Investimento',
}

export function formatAccountOptionLabel(account: { name: string; type: string }): string {
  const typeLabel = ACCOUNT_TYPE_SINGULAR[account.type] ?? account.type
  return `${account.name} · ${typeLabel}`
}

export function formatCardCount(count: number): string {
  if (count === 1) return '1 cartão físico/virtual'
  return `${count} cartões físicos/virtuais`
}

export function findCreditAccountsAtInstitution<
  T extends { type: string; institution?: string | null },
>(accounts: T[], institution: string | null | undefined): T[] {
  if (!institution) return []
  return accounts.filter(a => a.type === 'credit_card' && a.institution === institution)
}

export const PAYMENT_ACCOUNT_TYPES = ['checking', 'savings', 'cash'] as const

export function isPaymentAccountType(type: string): boolean {
  return (PAYMENT_ACCOUNT_TYPES as readonly string[]).includes(type)
}

export function filterPaymentAccounts<T extends { id: string; type: string; name: string }>(
  accounts: T[],
  excludeId?: string
): T[] {
  return accounts.filter(
    account => isPaymentAccountType(account.type) && account.id !== excludeId
  )
}

export const CARD_BRANDS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'Amex' },
] as const

export const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Aleatória' },
] as const

const TYPE_ORDER = ['credit_card', 'checking', 'savings', 'cash', 'investment'] as const

export function institutionLabel(value: string | null | undefined): string {
  if (!value) return 'Outros'
  const found = INSTITUTIONS.find(i => i.value === value)
  return found?.label ?? value
}

export function suggestCreditCardAccountName(
  baseName: string,
  institution: string,
  accounts: Array<{ name: string; isActive?: boolean | null }>
): string {
  const takenNames = new Set(
    accounts
      .map(account => account.name.trim().toLowerCase())
      .filter(Boolean)
  )

  const label = institutionLabel(institution)
  const candidates = [baseName, `${label} Cartão`, `${baseName} Cartão`, `${label} Fatura`]

  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    if (trimmed && !takenNames.has(trimmed.toLowerCase())) {
      return trimmed
    }
  }

  let suffix = 2
  while (takenNames.has(`${baseName} ${suffix}`.toLowerCase())) {
    suffix += 1
  }

  return `${baseName} ${suffix}`
}

const INSTITUTION_BRANDS: Record<string, { bg: string; text: string }> = {
  nubank: { bg: 'bg-violet-100', text: 'text-violet-700' },
  itau: { bg: 'bg-orange-100', text: 'text-orange-700' },
  bradesco: { bg: 'bg-rose-100', text: 'text-rose-700' },
  santander: { bg: 'bg-red-100', text: 'text-red-700' },
  bb: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  caixa: { bg: 'bg-blue-100', text: 'text-blue-700' },
  inter: { bg: 'bg-orange-100', text: 'text-orange-800' },
  c6: { bg: 'bg-slate-200', text: 'text-slate-800' },
  xp: { bg: 'bg-slate-900', text: 'text-white' },
}

export function institutionBrandStyle(institution: string | null | undefined): {
  bg: string
  text: string
} {
  if (!institution) return { bg: 'bg-slate-100', text: 'text-slate-600' }
  return INSTITUTION_BRANDS[institution] ?? { bg: 'bg-slate-100', text: 'text-slate-600' }
}

export function resolveInstitutionValue(
  preset: string | undefined,
  custom: string | undefined
): string | null {
  if (!preset) return null
  if (preset === INSTITUTION_OTHER) {
    const trimmed = custom?.trim()
    return trimmed || null
  }
  return preset
}

export function institutionToFormFields(institution: string | null | undefined): {
  institutionKey: string
  institutionName: string
} {
  if (!institution) return { institutionKey: '', institutionName: '' }
  const found = INSTITUTIONS.find(item => item.value === institution)
  if (found) return { institutionKey: found.value, institutionName: '' }
  return { institutionKey: INSTITUTION_OTHER, institutionName: institution }
}

export type AccountSidebarSection<T> = {
  key: string
  label: string
  institution: string | null
  accounts: T[]
  createOptions: { label: string; type: CreateAccountBodyType }[]
}

const PAYMENT_INSTITUTION_CREATE_OPTIONS: { label: string; type: CreateAccountBodyType }[] = [
  { label: 'Adicionar conta corrente', type: 'checking' },
  { label: 'Adicionar poupança', type: 'savings' },
]

const CASH_CREATE_OPTIONS: { label: string; type: CreateAccountBodyType }[] = [
  { label: 'Adicionar carteira', type: 'cash' },
]

export function groupAccountsByInstitution<T extends { institution?: string | null; type: string; name: string }>(
  accounts: T[]
): { key: string; label: string; accounts: T[] }[] {
  const groups = new Map<string, T[]>()

  for (const account of accounts) {
    const key = account.institution ?? ''
    const list = groups.get(key) ?? []
    list.push(account)
    groups.set(key, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (!a) return 1
      if (!b) return -1
      return institutionLabel(a).localeCompare(institutionLabel(b), 'pt-BR')
    })
    .map(([key, items]) => ({
      key,
      label: institutionLabel(key || null),
      accounts: [...items].sort((a, b) => {
        const typeIndex = (type: string) => {
          const idx = TYPE_ORDER.indexOf(type as (typeof TYPE_ORDER)[number])
          return idx === -1 ? TYPE_ORDER.length : idx
        }
        const typeDiff = typeIndex(a.type) - typeIndex(b.type)
        if (typeDiff !== 0) return typeDiff
        return a.name.localeCompare(b.name, 'pt-BR')
      }),
    }))
}

export function accountTypeIcon(type: string): LucideIcon {
  const found = ACCOUNT_TYPES.find(t => t.type === type)
  if (found) return found.icon
  if (type === 'savings') return Banknote
  return Landmark
}

export function cardBrandLabel(brand: string | null | undefined): string | null {
  if (!brand) return null
  return CARD_BRANDS.find(b => b.value === brand)?.label ?? brand
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function formatAccountsSummary(
  accounts: { type: string }[]
): string {
  const bankCount = accounts.filter(a => a.type !== 'credit_card').length
  const cardCount = accounts.filter(a => a.type === 'credit_card').length

  const parts: string[] = []
  if (bankCount > 0) {
    parts.push(`${bankCount} ${bankCount === 1 ? 'conta' : 'contas'}`)
  }
  if (cardCount > 0) {
    parts.push(`${cardCount} ${cardCount === 1 ? 'cartão' : 'cartões'}`)
  }
  return parts.join(' · ')
}

export type AccountTypeSectionId = 'bank' | 'credit_card' | 'investment' | 'cash'

export type AccountTypeSection<T> = {
  id: AccountTypeSectionId
  label: string
  accounts: T[]
  createLabel: string
  createType: CreateAccountBodyType
}

const TYPE_SECTION_DEFS: {
  id: AccountTypeSectionId
  label: string
  types: string[]
  createLabel: string
  createType: CreateAccountBodyType
}[] = [
  {
    id: 'bank',
    label: 'Contas bancárias',
    types: ['checking', 'savings'],
    createLabel: 'Adicionar conta',
    createType: 'checking',
  },
  {
    id: 'credit_card',
    label: 'Cartões de crédito',
    types: ['credit_card'],
    createLabel: 'Adicionar cartão',
    createType: 'credit_card',
  },
  {
    id: 'investment',
    label: 'Investimentos',
    types: ['investment'],
    createLabel: 'Adicionar investimento',
    createType: 'investment',
  },
  {
    id: 'cash',
    label: 'Carteira',
    types: ['cash'],
    createLabel: 'Adicionar carteira',
    createType: 'cash',
  },
]

export function groupAccountsForSelect<
  T extends { institution?: string | null; type: string; name: string },
>(accounts: T[]): { key: string; label: string; accounts: T[] }[] {
  return TYPE_SECTION_DEFS.map(section => ({
    key: section.id,
    label: section.label,
    accounts: sortAccountsForSelect(
      accounts.filter(account => section.types.includes(account.type))
    ),
  })).filter(section => section.accounts.length > 0)
}

function sortAccountsForSelect<T extends { institution?: string | null; name: string }>(
  accounts: T[]
): T[] {
  return [...accounts].sort((a, b) => {
    const institutionDiff = institutionLabel(a.institution).localeCompare(
      institutionLabel(b.institution),
      'pt-BR'
    )
    if (institutionDiff !== 0) return institutionDiff
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}

export function groupCreditCardsForSidebar<
  T extends { type: string; name: string; institution?: string | null },
>(accounts: T[], search = ''): AccountSidebarSection<T>[] {
  const creditCards = accounts.filter(account => account.type === 'credit_card')
  const q = search.trim().toLowerCase()
  const filtered = q
    ? creditCards.filter(account => {
        const institution = institutionLabel(account.institution).toLowerCase()
        return account.name.toLowerCase().includes(q) || institution.includes(q)
      })
    : creditCards

  return groupAccountsByInstitution(filtered).map(group => ({
    key: group.key || '__other__',
    label: group.label,
    institution: group.key || null,
    accounts: group.accounts,
    createOptions: [{ label: 'Adicionar cartão', type: 'credit_card' as CreateAccountBodyType }],
  }))
}

export function groupAccountsForSidebar<
  T extends { type: string; name: string; institution?: string | null },
>(accounts: T[], search = ''): AccountSidebarSection<T>[] {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? accounts.filter(account => {
        const institution = institutionLabel(account.institution).toLowerCase()
        return account.name.toLowerCase().includes(q) || institution.includes(q)
      })
    : accounts

  const cashAccounts = sortByName(filtered.filter(account => account.type === 'cash'))
  const nonCash = filtered.filter(account => account.type !== 'cash')

  const sections: AccountSidebarSection<T>[] = groupAccountsByInstitution(nonCash).map(group => ({
    key: group.key || '__other__',
    label: group.label,
    institution: group.key || null,
    accounts: group.accounts,
    createOptions: PAYMENT_INSTITUTION_CREATE_OPTIONS,
  }))

  if (cashAccounts.length > 0 || !q) {
    sections.push({
      key: '__cash__',
      label: 'Carteira',
      institution: null,
      accounts: cashAccounts,
      createOptions: CASH_CREATE_OPTIONS,
    })
  }

  return sections.filter(section => section.accounts.length > 0 || !q)
}

export function groupAccountsByType<
  T extends { type: string; name: string; institution?: string | null },
>(accounts: T[], search = ''): AccountTypeSection<T>[] {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? accounts.filter(account => {
        const institution = institutionLabel(account.institution).toLowerCase()
        return account.name.toLowerCase().includes(q) || institution.includes(q)
      })
    : accounts

  return TYPE_SECTION_DEFS.map(section => ({
    id: section.id,
    label: section.label,
    createLabel: section.createLabel,
    createType: section.createType,
    accounts: sortByName(filtered.filter(account => section.types.includes(account.type))),
  })).filter(section => section.accounts.length > 0 || !q)
}
