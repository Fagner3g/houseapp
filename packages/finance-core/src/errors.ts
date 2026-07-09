export class FinanceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FinanceValidationError'
  }
}
