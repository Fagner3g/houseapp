/**
 * Adiciona o footer padrão do HouseApp em todas as mensagens
 */
export function addMessageFooter(message: string, organizationSlug?: string): string {
  const baseUrl = 'https://app.jarvis.dev.br/'
  const url = organizationSlug ? `${baseUrl}${organizationSlug}/transactions` : baseUrl

  const footer = `---
🏠 HouseApp - Sistema de Gestão Financeira
${url}`

  return `${message}\n\n${footer}`
}
