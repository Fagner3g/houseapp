import { CreateAlertRuleBodyChannelsItem } from '@/api/generated/model/createAlertRuleBodyChannelsItem'

export const CHANNEL_OPTIONS = [
  { value: CreateAlertRuleBodyChannelsItem.in_app, label: 'App' },
  { value: CreateAlertRuleBodyChannelsItem.whatsapp, label: 'WhatsApp' },
  { value: CreateAlertRuleBodyChannelsItem.extension, label: 'Extensão' },
] as const

export const CHANNEL_LABELS = Object.fromEntries(
  CHANNEL_OPTIONS.map(channel => [channel.value, channel.label])
) as Record<string, string>

export const TRIGGER_LABELS: Record<'upcoming' | 'overdue', string> = {
  upcoming: 'Antes do vencimento',
  overdue: 'Vencidas',
}

export function formatChannelLabels(channels: string[]): string {
  return channels.map(channel => CHANNEL_LABELS[channel] ?? channel).join(', ')
}
