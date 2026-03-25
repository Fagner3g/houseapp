type Props = {
  leftIcon: React.ReactNode
  title: string
  ownerName: string
  amount: number
  rightIcon: React.ReactNode
  rightPrimaryText: string
  rightSecondaryText: string
}

export function DashboardRowContent({
  leftIcon,
  title,
  ownerName,
  amount,
  rightIcon,
  rightPrimaryText,
  rightSecondaryText,
}: Props) {
  return (
    <>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {leftIcon}
          <h4 className="font-medium text-foreground">{title}</h4>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>{ownerName}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">
              R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 justify-end mb-1">
          {rightIcon}
          <span className="text-sm font-medium">{rightPrimaryText}</span>
        </div>
        <p className="text-xs text-muted-foreground">{rightSecondaryText}</p>
      </div>
    </>
  )
}
