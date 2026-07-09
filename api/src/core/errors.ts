import { StatusCodes } from 'http-status-codes'

export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export class AppError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number

  constructor(code: ErrorCode, statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
  }
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(ErrorCodes.NOT_FOUND, StatusCodes.NOT_FOUND, message)
}

export function conflict(message = 'Resource already exists'): AppError {
  return new AppError(ErrorCodes.CONFLICT, StatusCodes.CONFLICT, message)
}

export function badRequest(message: string): AppError {
  return new AppError(ErrorCodes.BAD_REQUEST, StatusCodes.BAD_REQUEST, message)
}
