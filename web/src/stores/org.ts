import { create } from 'zustand'

interface OrgState {
  slug: string
  setSlug: (slug: string) => void
}

export const useOrgStore = create<OrgState>(set => ({
  slug: '',
  setSlug: slug => set({ slug }),
}))
