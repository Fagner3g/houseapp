/**
 * Adiciona o footer padrão do HouseApp em todas as mensagens
 */
export function addMessageFooter(message: string): string {
  const footer = `---
🏠 HouseApp - Sistema de Gestão Financeira
https://app.jarvis.dev.br/`

  return `${message}\n\n${footer}`
}
