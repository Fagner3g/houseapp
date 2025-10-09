/**
 * Utilitário para calcular informações de parcelas de transações
 */

export interface InstallmentsInfo {
  total: number
  paid: number
  remaining: number
  isRecurring: boolean
}

/**
 * Calcula informações de parcelas para uma transação
 */
export function calculateInstallmentsInfo(
  installmentsTotal: number | null | undefined,
  installmentsPaid: number | null | undefined,
  status: 'paid' | 'pending' | 'canceled'
): InstallmentsInfo {
  // Considera recorrente quando o campo existe (mesmo que seja null = infinito)
  const isRecurring = installmentsTotal !== undefined

  if (!isRecurring) {
    // Transação única: sempre 1 parcela
    const paid = status === 'paid' ? 1 : 0
    return {
      total: 1,
      paid,
      remaining: 1 - paid,
      isRecurring: false,
    }
  }

  // Transação recorrente: quando total é null interpretamos como recorrência infinita
  // Para relatórios, usamos um total aproximado baseado nas parcelas já pagas + 1 próxima
  const total = installmentsTotal == null ? (installmentsPaid ?? 0) + 1 : installmentsTotal
  const paid = installmentsPaid ?? 0
  const remaining = Math.max(0, total - paid)

  return {
    total,
    paid,
    remaining,
    isRecurring: true,
  }
}

/**
 * Calcula o número total de parcelas baseado nos parâmetros de recorrência
 */
export function calculateTotalInstallments(
  isRecurring: boolean,
  recurrenceType?: 'monthly' | 'weekly' | 'yearly',
  recurrenceInterval?: number,
  recurrenceUntil?: Date,
  recurrenceStart?: Date,
  installmentsTotal?: number
): number | null {
  if (!isRecurring) {
    return 1 // Transação única sempre tem 1 parcela
  }

  // Se installmentsTotal foi fornecido explicitamente, usar esse valor
  if (installmentsTotal !== undefined && installmentsTotal !== null) {
    return installmentsTotal
  }

  // Se não foi fornecido, calcular baseado na data final
  if (recurrenceUntil && recurrenceStart && recurrenceType && recurrenceInterval) {
    const start = new Date(recurrenceStart)
    const end = new Date(recurrenceUntil)

    let count = 0
    const current = new Date(start)

    while (current <= end) {
      count++

      // Calcular próxima data baseada no tipo de recorrência
      switch (recurrenceType) {
        case 'weekly':
          current.setDate(current.getDate() + 7 * recurrenceInterval)
          break
        case 'monthly':
          current.setMonth(current.getMonth() + recurrenceInterval)
          break
        case 'yearly':
          current.setFullYear(current.getFullYear() + recurrenceInterval)
          break
      }
    }

    return count > 0 ? count : null
  }

  return null // Não foi possível calcular
}
