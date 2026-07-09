import { FormControl, FormDescription, FormItem, FormLabel } from '@/components/ui/form'
import { cn } from '@/lib/utils'

import {
  ACCOUNT_COLOR_PRESETS,
  ACCOUNT_ICON_OPTIONS,
  defaultAccountColor,
} from '../account-appearance'

interface AccountAppearanceFieldsProps {
  type: string
  institution?: string | null
  color: string | null | undefined
  icon: string | null | undefined
  onColorChange: (color: string | null) => void
  onIconChange: (icon: string | null) => void
}

export function AccountAppearanceFields({
  type,
  institution,
  color,
  icon,
  onColorChange,
  onIconChange,
}: AccountAppearanceFieldsProps) {
  const suggestedColor = defaultAccountColor({ institution, type })

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">Aparência do card</p>
        <p className="mt-1 text-xs text-slate-500">
          Cor e ícone exibidos na lista de contas. A cor da instituição é sugerida automaticamente.
        </p>
      </div>

      <FormItem>
        <FormLabel>Cor</FormLabel>
        <FormControl>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLOR_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  onClick={() => onColorChange(preset.value)}
                  className={cn(
                    'size-8 rounded-full border-2 transition-transform hover:scale-105',
                    color === preset.value
                      ? 'border-slate-900 ring-2 ring-slate-900/20'
                      : 'border-white ring-1 ring-slate-200'
                  )}
                  style={{ backgroundColor: preset.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color ?? suggestedColor}
                onChange={event => onColorChange(event.target.value)}
                className="size-10 cursor-pointer rounded border border-slate-200 bg-white p-1"
                aria-label="Escolher cor personalizada"
              />
              <button
                type="button"
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
                onClick={() => onColorChange(null)}
              >
                Usar cor da instituição
              </button>
            </div>
          </div>
        </FormControl>
        <FormDescription>
          Sugestão atual:{' '}
          <button
            type="button"
            className="font-medium text-slate-700 underline-offset-2 hover:underline"
            onClick={() => onColorChange(suggestedColor)}
          >
            {suggestedColor}
          </button>
        </FormDescription>
      </FormItem>

      <FormItem>
        <FormLabel>Ícone</FormLabel>
        <FormControl>
          <div className="grid grid-cols-4 gap-2">
            {ACCOUNT_ICON_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                title={option.label}
                aria-label={option.label}
                onClick={() => onIconChange(option.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-medium transition-colors',
                  icon === option.value
                    ? 'border-slate-900 bg-slate-50 text-slate-900'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
                )}
              >
                <option.icon className="size-4" />
                {option.label}
              </button>
            ))}
          </div>
        </FormControl>
        <button
          type="button"
          className="text-xs font-medium text-slate-500 hover:text-slate-900"
          onClick={() => onIconChange(null)}
        >
          Usar ícone padrão do tipo
        </button>
      </FormItem>
    </div>
  )
}
