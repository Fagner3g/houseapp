import { useOrganization } from '@/hooks/use-organization'
import { Button } from '@/components/ui/button'

export function OrganizationSwitcher() {
  const { organizationId, organizations, setOrganizationId } = useOrganization()

  return (
    <div className="p-2">
      <select
        className="w-full rounded border border-input bg-background p-2 text-sm"
        value={organizationId ?? ''}
        onChange={e => setOrganizationId(e.target.value)}
      >
        <option value="" disabled>
          Selecione a organização
        </option>
        {organizations.map(org => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
      <Button variant="outline" size="sm" className="mt-2 w-full">
        Nova organização
      </Button>
    </div>
  )
}
