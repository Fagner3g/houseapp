export class BadRequestError extends Error {}

export class UnauthorizedError extends Error {
  constructor(message?: string) {
    super(message ?? 'Unauthorized')
  }
}

export class ForbiddenError extends Error {
  constructor(message?: string) {
    super(message ?? 'Unauthorized to access this resource')
  }
}

export class UserAlreadyExistsError extends Error {
  constructor(message?: string) {
    super(message ?? 'User already exists')
  }
}
