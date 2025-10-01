/**
 * Determina o tipo de transação contextualizado baseado na perspectiva do usuário
 *
 * @param originalType - Tipo original da transação ('income' | 'expense')
 * @param ownerId - ID do proprietário da transação (quem criou)
 * @param currentUserId - ID do usuário atual logado
 * @returns Tipo contextualizado da perspectiva do usuário atual
 */
export function getContextualizedTransactionType(
  originalType: 'income' | 'expense',
  ownerId: string,
  currentUserId: string
): 'income' | 'expense' {
  // Se o usuário atual é o proprietário, mantém o tipo original
  if (ownerId === currentUserId) {
    return originalType
  }

  // Se o usuário atual não é o proprietário, inverte o tipo
  // Receita do proprietário = Despesa para o usuário atual
  // Despesa do proprietário = Receita para o usuário atual
  return originalType === 'income' ? 'expense' : 'income'
}
