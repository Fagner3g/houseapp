/** Shared Stacky-inspired layout classes */
export const stackyDrawerWidth = '600px'

export const stackyDrawerContent =
  'fixed inset-y-0! right-0! left-auto! z-[51]! mt-0! flex h-full! w-full! max-w-[600px]! min-h-0 flex-col overflow-hidden rounded-tl-[24px] rounded-bl-[24px] rounded-r-none bg-white shadow-2xl transition-[max-width,border-radius,box-shadow] duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]'

/** Full-screen backdrop behind the drawer panel */
export const stackyDrawerOverlay =
  'fixed inset-0! z-50! bg-black/45! transition-opacity duration-[400ms]'

/** Hidden while a nested drawer owns the backdrop */
export const stackyDrawerOverlaySuppressed = 'opacity-0! pointer-events-none!'

/** Full-screen backdrop above the back drawer — dims page + first drawer, front panel stays on z-[101] */
export const stackyDrawerOverlayNested =
  'fixed inset-0! z-[100]! bg-black/45! transition-opacity duration-[400ms]'

/** Outer shell when a drawer opens on top — stretches left to peek behind the front panel */
export const stackyDrawerContentStackedOuter =
  'pointer-events-none! max-w-[760px]! rounded-tl-[28px]! rounded-bl-[28px]! shadow-md'

/** Inner shell transition — applied always so stacked ↔ normal animates smoothly */
export const stackyDrawerInnerShell =
  'flex h-full min-h-0 flex-col transition-[opacity,filter] duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]'

/** Subtle depth cue on the back drawer when a nested panel is open */
export const stackyDrawerInnerShellStacked = 'brightness-[0.98]'

/** Cascading drawer opened on top of transaction/form drawer */
export const stackyDrawerContentNested =
  'fixed inset-y-0! right-0! left-auto! z-[101]! mt-0! flex h-full! w-full! max-w-[600px]! min-h-0 flex-col overflow-hidden rounded-tl-[24px] rounded-bl-[24px] rounded-r-none bg-white shadow-[0_0_60px_rgba(0,0,0,0.18)] transition-[transform,box-shadow] duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]'

export const stackyDrawerHeader =
  'flex shrink-0 flex-row items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4'

export const stackyDrawerTitle = 'text-xl font-semibold text-gray-900'

export const stackyDrawerCloseButton =
  'cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600'

export const stackyDrawerLabel = 'text-sm font-medium text-gray-700'

/** Label row with optional inline action (e.g. small + button) */
export const stackyDrawerLabelRow = 'flex min-h-6 items-center gap-1.5'

/** Plain label slot in grid rows — matches height of label rows with actions */
export const stackyDrawerFormLabelSlot = 'flex min-h-6 items-center'

export const stackyDrawerAddButton =
  'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-700'

/** Labels dentro do formulário do drawer */
export const stackyDrawerForm =
  '[&_[data-slot=form-item]]:min-w-0 [&_[data-slot=form-label]]:text-sm [&_[data-slot=form-label]]:font-medium [&_[data-slot=form-label]]:text-gray-700'

export const stackyDrawerFooter =
  'mt-auto shrink-0 rounded-bl-[24px] border-t border-slate-200 bg-slate-100/95 px-6 py-4 shadow-[0_-8px_24px_-10px_rgba(15,23,42,0.14)] backdrop-blur-md'

/** Type tabs: Despesa / Receita / Transferência */
export const stackyTypeSegmentedControl = 'w-full gap-0 rounded-lg bg-slate-100 p-1'

export const stackyTypeSegmentItem =
  'flex-1 rounded-md border border-transparent bg-transparent text-slate-500 shadow-none hover:bg-transparent hover:text-slate-600 data-[state=on]:bg-white data-[state=on]:shadow-sm'

export const stackySegmentItemExpense =
  'data-[state=on]:border-red-200 data-[state=on]:text-red-600 data-[state=on]:hover:text-red-600'

export const stackySegmentItemIncome =
  'data-[state=on]:border-emerald-200 data-[state=on]:text-emerald-600 data-[state=on]:hover:text-emerald-600'

export const stackySegmentItemTransfer =
  'data-[state=on]:border-slate-200 data-[state=on]:text-slate-900 data-[state=on]:hover:text-slate-900'

/** Status, repetição interna, etc. */
export const stackySegmentedControl = 'min-w-0 w-full max-w-full gap-0 rounded-md bg-slate-100 p-1'

export const stackySegmentItem =
  'min-w-0 shrink flex-1 rounded-sm border-0 bg-transparent px-2 text-slate-500 shadow-none hover:bg-transparent hover:text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm'

/** Grid rows inside drawer forms — 600px panel with date/status fields */
export const stackyDrawerFormRow = 'grid grid-cols-12 gap-3'

export const stackyDrawerFormItem = 'min-w-0 overflow-hidden'

export const stackyPrimaryButton = 'cursor-pointer bg-slate-800 text-white hover:bg-slate-900'

export const stackySecondaryButton =
  'cursor-pointer border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'

/** Observações e anexos — fundo cinza */
export const stackyDrawerPanelMuted =
  'overflow-hidden rounded-lg border border-slate-200 bg-slate-50'

/** Repetição do lançamento — container cinza */
export const stackyRecurrencePanel =
  'overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4'

export const stackyRecurrenceSegmentedControl = 'w-full gap-0 rounded-lg bg-slate-100 p-1'

export const stackyRecurrenceSegmentItem =
  'flex-1 rounded-md border border-transparent bg-transparent text-slate-500 shadow-none hover:bg-transparent hover:text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm'

export const stackySelectTrigger =
  'bg-white focus-visible:border-slate-400 focus-visible:ring-slate-400/30 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate'

export const stackySelectItem =
  'focus:bg-slate-800 focus:text-white data-[highlighted]:bg-slate-800 data-[highlighted]:text-white'

export const stackyDrawerPanel = 'overflow-hidden rounded-lg border border-slate-200 bg-white'

export const stackyFilePickerButton =
  'cursor-pointer rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100'

export const pageShell = 'flex flex-col gap-4 py-4 pb-24 md:gap-6 md:py-6 md:pb-6'

export const pageInset = 'px-4 lg:px-6'

export const pageTitle = 'text-xl font-semibold tracking-tight text-slate-900 md:text-2xl'

export const pageSubtitle = 'text-sm text-slate-500'

/** Underline tabs for page-level navigation (Extrato, Detalhes, etc.) */
export const pageTabsList =
  'mb-1 h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0'

export const pageTabsTrigger =
  'flex-none cursor-pointer gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-slate-500 shadow-none transition-colors hover:bg-transparent hover:text-slate-700 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 data-[state=active]:shadow-none'

/** Label + value pairs inside settings/detail panels */
export const settingsFieldLabel =
  'text-xs font-medium uppercase tracking-wide text-slate-500'

export const settingsFieldValue = 'mt-1 font-medium text-slate-900'

export const settingsPanel = 'kpi-card grid gap-6 sm:grid-cols-2'
