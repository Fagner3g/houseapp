import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MemberSelect } from '@/features/accounts/components/member-select'

type PersonMode = 'member' | 'contact'

interface SplitPersonFieldsProps {
  personMode: PersonMode
  onPersonModeChange: (mode: PersonMode) => void
  selectedUserId: string | null
  onSelectedUserIdChange: (userId: string | null) => void
  contactName: string
  onContactNameChange: (name: string) => void
  contactPhone: string
  onContactPhoneChange: (phone: string) => void
  disabled?: boolean
}

export function SplitPersonFields({
  personMode,
  onPersonModeChange,
  selectedUserId,
  onSelectedUserIdChange,
  contactName,
  onContactNameChange,
  contactPhone,
  onContactPhoneChange,
  disabled = false,
}: SplitPersonFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Quem deve</Label>
        <ToggleGroup
          type="single"
          value={personMode}
          onValueChange={mode => mode && onPersonModeChange(mode as PersonMode)}
          className="flex w-full flex-wrap justify-start gap-2"
          disabled={disabled}
        >
          <ToggleGroupItem value="member" className="px-3 text-xs">
            Membro
          </ToggleGroupItem>
          <ToggleGroupItem value="contact" className="px-3 text-xs">
            Contato externo
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {personMode === 'member' ? (
        <MemberSelect
          creatable
          label="Membro"
          value={selectedUserId}
          onChange={onSelectedUserIdChange}
          disabled={disabled}
        />
      ) : (
        <>
          <Input
            placeholder="Nome do contato"
            value={contactName}
            onChange={e => onContactNameChange(e.target.value)}
            disabled={disabled}
          />
          <PhoneInput
            placeholder="Telefone (WhatsApp)"
            value={contactPhone}
            onValueChange={onContactPhoneChange}
            disabled={disabled}
          />
        </>
      )}
    </div>
  )
}
