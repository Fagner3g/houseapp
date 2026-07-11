import { buildUrgencyBanner, emphasizeMoneyInLine } from './emphasis'
import { buildGreeting } from './format'
import { buildWhatsAppBatchRenderUnits, renderWhatsAppBatchUnitLines } from './render'
import { buildGrandShareTotalLine, sumDueShareCentavos } from './due-share'
import {
  WHATSAPP_BATCH_SEPARATOR,
  type WhatsAppAlertBatchItem,
  type WhatsAppBatchRenderUnit,
} from './types'

function collectUnitItems(unit: WhatsAppBatchRenderUnit): WhatsAppAlertBatchItem[] {
  return unit.type === 'credit_card_group' ? unit.items : [unit.item]
}

function countSplitItems(items: WhatsAppAlertBatchItem[]): number {
  return items.filter(item => item.isSplit).length
}

function unitHasSplitItems(unit: WhatsAppBatchRenderUnit): boolean {
  return countSplitItems(collectUnitItems(unit)) > 0
}

export function buildWhatsAppBatchAlertMessage(
  input: {
    recipientName: string
    items: WhatsAppAlertBatchItem[]
  },
  referenceDate = new Date()
): string {
  const lines = [
    buildGreeting(input.recipientName, referenceDate),
    '',
    buildUrgencyBanner(input.items),
  ]
  const units = buildWhatsAppBatchRenderUnits(input.items)
  const allItems = units.flatMap(collectUnitItems)
  const showGrandTotal = units.filter(unitHasSplitItems).length >= 2

  units.forEach((unit, index) => {
    if (index > 0) {
      lines.push('')
      lines.push(WHATSAPP_BATCH_SEPARATOR)
      lines.push('')
    }

    if (unit.type === 'credit_card_group') {
      const cardSplitCount = countSplitItems(unit.items)
      const includeShareTotal =
        cardSplitCount >= 2 || (showGrandTotal && cardSplitCount >= 1)
      lines.push(
        ...renderWhatsAppBatchUnitLines(unit, {
          includeShareTotal,
          shareTotalAsGrand: includeShareTotal && !showGrandTotal,
        })
      )
      return
    }

    lines.push(...renderWhatsAppBatchUnitLines(unit))
  })

  if (showGrandTotal) {
    const totalLine = buildGrandShareTotalLine(sumDueShareCentavos(allItems))
    if (totalLine) {
      lines.push('')
      lines.push(emphasizeMoneyInLine(totalLine))
    }
  }

  return lines.join('\n')
}
