import { badRequest, notFound } from '@/core/errors'
import {
  getProvider,
  listAvailableProviders,
  type LLMMessage,
  type ProviderName,
} from '@/domain/ai/providers'

import { executeAction, previewToolCall } from './action-executor'
import { getAction, removeAction, storeAction } from './action-store'
import {
  buildChatSystemPrompt,
  buildFinancialContext,
  isValidActionName,
} from './financial-context'
import type { ToolCallPayload } from './tools/types'

export type ChatHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type SseTextEvent = {
  type: 'text'
  chunk: string
}

export type SseActionPreviewEvent = {
  type: 'action_preview'
  action: string
  actionId: string
  data: Record<string, unknown>
  message: string
}

export type SseEvent = SseTextEvent | SseActionPreviewEvent

const TOOL_CALL_PREFIX = 'TOOL_CALL:'

function findToolMarkerIndex(buffer: string): number {
  const toolCallIndex = buffer.indexOf(TOOL_CALL_PREFIX)
  const jsonIndex = buffer.search(/\n\s*\{[\s\S]*"action"\s*:\s*"/)

  if (toolCallIndex >= 0 && jsonIndex >= 0) {
    return Math.min(toolCallIndex, jsonIndex)
  }

  return toolCallIndex >= 0 ? toolCallIndex : jsonIndex
}

export class AiService {
  listProviders() {
    return listAvailableProviders()
  }

  async *streamChat(input: {
    organizationId: string
    userId: string
    message: string
    history?: ChatHistoryMessage[]
    provider?: ProviderName
  }): AsyncGenerator<SseEvent> {
    const context = await buildFinancialContext(input.organizationId)
    const systemPrompt = buildChatSystemPrompt(context)

    const history: LLMMessage[] = (input.history ?? []).map(item => ({
      role: item.role,
      content: item.content,
    }))

    const messages: LLMMessage[] = [...history, { role: 'user', content: input.message }]

    let fullResponse = ''

    const availableProviders = listAvailableProviders()
    const providerName = input.provider ?? availableProviders[0]?.name

    if (providerName) {
      const provider = getProvider(providerName)
      let streamBuffer = ''

      for await (const chunk of provider.stream(messages, systemPrompt)) {
        fullResponse += chunk
        streamBuffer += chunk

        const toolIndex = findToolMarkerIndex(streamBuffer)
        if (toolIndex >= 0) {
          const safeText = streamBuffer.slice(0, toolIndex)
          if (safeText) {
            yield { type: 'text', chunk: safeText }
          }
          streamBuffer = ''
          continue
        }

        if (streamBuffer.length > 32) {
          const emitLength = streamBuffer.length - 32
          const emitChunk = streamBuffer.slice(0, emitLength)
          streamBuffer = streamBuffer.slice(emitLength)
          if (emitChunk) {
            yield { type: 'text', chunk: emitChunk }
          }
        }
      }

      if (streamBuffer) {
        const toolIndex = findToolMarkerIndex(streamBuffer)
        const safeText = toolIndex >= 0 ? streamBuffer.slice(0, toolIndex) : streamBuffer
        if (safeText && !safeText.includes(TOOL_CALL_PREFIX)) {
          yield { type: 'text', chunk: safeText }
        }
      }
    } else {
      const mock = buildMockResponse(input.message, context)
      fullResponse = mock.text

      for (const chunk of chunkText(mock.text)) {
        yield { type: 'text', chunk }
      }
    }

    const toolPayload = extractToolCall(fullResponse) ?? tryMockToolCall(input.message, context)

    if (toolPayload) {
      try {
        const preview = previewToolCall(context, toolPayload)
        const pending = storeAction(input.userId, input.organizationId, preview.action, preview.data)

        yield {
          type: 'action_preview',
          action: preview.action,
          actionId: pending.id,
          data: preview.data,
          message: preview.message,
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : 'Falha ao gerar preview da ação'
        yield { type: 'text', chunk: `\n\nNão consegui gerar o preview: ${messageText}` }
      }
    }
  }

  async confirmAction(actionId: string, userId: string, orgId: string) {
    const pending = getAction(actionId)

    if (!pending) {
      throw notFound('Action not found or expired')
    }

    if (pending.userId !== userId || pending.orgId !== orgId) {
      throw notFound('Action not found or expired')
    }

    const result = await executeAction(pending)
    removeAction(actionId)

    return {
      success: true as const,
      action: result.action,
      entityId: result.entityId,
      result: result.result,
    }
  }

  rejectAction(actionId: string, userId: string, orgId: string) {
    const pending = getAction(actionId)

    if (!pending) {
      throw notFound('Action not found or expired')
    }

    if (pending.userId !== userId || pending.orgId !== orgId) {
      throw notFound('Action not found or expired')
    }

    removeAction(actionId)

    return { success: true as const }
  }
}

function extractToolCall(text: string): ToolCallPayload | null {
  const line = text
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith(TOOL_CALL_PREFIX))

  if (!line) {
    const jsonMatch = text.match(/\{[\s\S]*"action"\s*:\s*"(create_transaction|import_statement|pay_transaction|create_split|register_split_payment)"[\s\S]*\}/)

    if (jsonMatch) {
      return parseToolPayload(jsonMatch[0])
    }

    return null
  }

  return parseToolPayload(line.slice(TOOL_CALL_PREFIX.length).trim())
}

function parseToolPayload(raw: string): ToolCallPayload | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>

    if (!isValidActionName(parsed.action)) {
      return null
    }

    return parsed as ToolCallPayload
  } catch {
    return null
  }
}

function tryMockToolCall(
  message: string,
  context: Awaited<ReturnType<typeof buildFinancialContext>>
): ToolCallPayload | null {
  const createMatch = message.match(
    /criar\s+(?:uma\s+)?(despesa|receita|transfer[eê]ncia)\s+(?:de\s+)?r\$\s*(\d+(?:[.,]\d{1,2})?)\s+(.+)/i
  )

  if (createMatch) {
    const typeMap: Record<string, 'expense' | 'income' | 'transfer'> = {
      despesa: 'expense',
      receita: 'income',
      transferencia: 'transfer',
      transferência: 'transfer',
    }

    const type = typeMap[createMatch[1].toLowerCase()] ?? 'expense'
    const amount = createMatch[2].replace(',', '.')
    const title = createMatch[3].trim()

    return {
      action: 'create_transaction',
      title,
      amount,
      type,
      account_name: context.accounts[0]?.name,
    }
  }

  const importMatch = message.match(/importa(?:r)?\s+fatura/i)

  if (importMatch) {
    const jsonStart = message.indexOf('{')
    const jsonEnd = message.lastIndexOf('}')

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      try {
        const parsed = JSON.parse(message.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>

        if (Array.isArray(parsed.transactions)) {
          return {
            action: 'import_statement',
            account_name: typeof parsed.account_name === 'string' ? parsed.account_name : context.accounts[0]?.name,
            file_name: typeof parsed.file_name === 'string' ? parsed.file_name : 'chat-import.json',
            period_start: typeof parsed.period_start === 'string' ? parsed.period_start : new Date().toISOString(),
            period_end: typeof parsed.period_end === 'string' ? parsed.period_end : new Date().toISOString(),
            closing_date: typeof parsed.closing_date === 'string' ? parsed.closing_date : new Date().toISOString(),
            due_date: typeof parsed.due_date === 'string' ? parsed.due_date : new Date().toISOString(),
            transactions: parsed.transactions,
          }
        }
      } catch {
        return null
      }
    }
  }

  const payMatch = message.match(/(?:paguei|marcar|pagar)\s+(?:o|a)?\s*(.+?)(?:\s+como\s+pago)?$/i)

  if (payMatch) {
    return {
      action: 'pay_transaction',
      search_title: payMatch[1].trim(),
    }
  }

  return null
}

function buildMockResponse(
  message: string,
  context: Awaited<ReturnType<typeof buildFinancialContext>>
): { text: string } {
  const tool = tryMockToolCall(message, context)

  if (tool?.action === 'create_transaction') {
    return {
      text: 'Entendi! Vou preparar um preview da transação para você confirmar antes de salvar.',
    }
  }

  if (tool?.action === 'pay_transaction') {
    return {
      text: 'Encontrei a transação pendente. Confirme o pagamento no card abaixo.',
    }
  }

  if (tool?.action === 'import_statement') {
    return {
      text: 'Analisei os dados da fatura. Confira o preview das transações antes de importar.',
    }
  }

  return {
    text: `Olá! Sou o assistente financeiro do HouseApp. Posso ajudar a criar transações, importar faturas e marcar pagamentos. Você tem ${context.accounts.length} conta(s) e ${context.recentTransactions.length} transações recentes.`,
  }
}

function chunkText(text: string): string[] {
  const words = text.split(' ')
  const chunks: string[] = []

  for (let index = 0; index < words.length; index += 3) {
    chunks.push(`${words.slice(index, index + 3).join(' ')} `)
  }

  return chunks.length > 0 ? chunks : [text]
}

export const aiService = new AiService()
