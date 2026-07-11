import { collapseInstallmentSeriesItems } from './collapse-installments'
import { buildUrgencyBanner, emphasizeMoneyInLine } from './emphasis'
import { buildGreeting } from './format'
import {
  buildOrganizationHeader,
  partitionItemsByOrganization,
  WHATSAPP_ITEM_SEPARATOR,
} from './org-sections'
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

function appendUnitLines(
  lines: string[],
  units: WhatsAppBatchRenderUnit[],
  showGrandTotal: boolean,
  itemSeparator: string
): void {
  units.forEach((unit, index) => {
    if (index > 0) {
      lines.push('')
      lines.push(itemSeparator)
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
}

export function buildWhatsAppBatchAlertMessage(
  input: {
    recipientName: string
    items: WhatsAppAlertBatchItem[]
  },
  referenceDate = new Date()
): string {
  const items = collapseInstallmentSeriesItems(input.items)
  const lines = [
    buildGreeting(input.recipientName, referenceDate),
    '',
    buildUrgencyBanner(items),
  ]
  const sections = partitionItemsByOrganization(items)
  const useOrgSections = sections.some(section => section.organizationName != null)
  const allUnits = sections.flatMap(section => buildWhatsAppBatchRenderUnits(section.items))
  const allItems = allUnits.flatMap(collectUnitItems)
  const showGrandTotal = allUnits.filter(unitHasSplitItems).length >= 2

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      lines.push('')
      lines.push(WHATSAPP_BATCH_SEPARATOR)
      lines.push('')
    }

    if (useOrgSections && section.organizationName) {
      if (sectionIndex === 0) lines.push('')
      lines.push(buildOrganizationHeader(section.organizationName))
      lines.push('')
    }

    const units = buildWhatsAppBatchRenderUnits(section.items)
    const itemSeparator = useOrgSections ? WHATSAPP_ITEM_SEPARATOR : WHATSAPP_BATCH_SEPARATOR
    appendUnitLines(lines, units, showGrandTotal, itemSeparator)
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
