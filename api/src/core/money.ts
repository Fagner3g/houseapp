import {
  centavosToString,
  divideCentavos as divideCentavosKernel,
  formatCentavos,
  parseCentavos as parseCentavosKernel,
  FinanceValidationError,
} from '@houseapp/finance-core'

import { AppError, ErrorCodes } from './errors'

export { centavosToString, formatCentavos }

function toAppError(error: unknown): never {
  if (error instanceof FinanceValidationError) {
    throw new AppError(ErrorCodes.BAD_REQUEST, 400, error.message)
  }

  throw error
}

export function parseCentavos(input: string): bigint {
  try {
    return parseCentavosKernel(input)
  } catch (error) {
    toAppError(error)
  }
}

export function divideCentavos(total: bigint, parts: number): bigint[] {
  try {
    return divideCentavosKernel(total, parts)
  } catch (error) {
    toAppError(error)
  }
}
