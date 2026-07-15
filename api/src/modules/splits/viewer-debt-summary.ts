import type { SplitDebtPersonRow, SplitDebtSummary } from './split-debt-summary.logic'

export type SplitDebtPersonWithViewer = SplitDebtPersonRow & {
  isViewer: boolean
}

export type SplitDebtSummaryWithViewer = Omit<SplitDebtSummary, 'persons'> & {
  viewerIsCreditor: boolean
  viewerOwedTotal: string | null
  viewerRemainingTotal: string | null
  persons: SplitDebtPersonWithViewer[]
}

/** Attach viewer perspective flags without changing creditor residual (`myShareTotal`). */
export function withViewerDebtPerspective(
  summary: SplitDebtSummary,
  input: {
    viewerUserId?: string | null
    viewerIsCreditor: boolean
  }
): SplitDebtSummaryWithViewer {
  const persons = summary.persons.map(person => ({
    ...person,
    isViewer: Boolean(input.viewerUserId && person.userId === input.viewerUserId),
  }))
  const viewerPerson = persons.find(person => person.isViewer) ?? null
  const exposeViewerShare = !input.viewerIsCreditor && viewerPerson != null

  return {
    ...summary,
    viewerIsCreditor: input.viewerIsCreditor,
    viewerOwedTotal: exposeViewerShare ? viewerPerson.totalOwed : null,
    viewerRemainingTotal: exposeViewerShare ? viewerPerson.totalRemaining : null,
    persons,
  }
}
