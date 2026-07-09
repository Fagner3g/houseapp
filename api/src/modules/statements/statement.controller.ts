import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'
import type { ImportStatementBody } from './statement.schema'

type OrgParams = { slug: string }
type AccountParams = OrgParams & { accountId: string }
type StatementParams = AccountParams & { id: string }

export async function listStatementsController(
  request: FastifyRequest<{ Params: AccountParams }>,
  reply: FastifyReply
) {
  const statements = await container.statementService.list(
    request.organization.id,
    request.params.accountId
  )

  return reply.send({ statements })
}

export async function getStatementController(
  request: FastifyRequest<{ Params: StatementParams }>,
  reply: FastifyReply
) {
  const statement = await container.statementService.get(
    request.organization.id,
    request.params.accountId,
    request.params.id
  )

  return reply.send({ statement })
}

export async function importStatementController(
  request: FastifyRequest<{ Params: AccountParams; Body: ImportStatementBody }>,
  reply: FastifyReply
) {
  const result = await container.statementService.import(
    request.organization.id,
    request.params.accountId,
    request.user.sub,
    request.body
  )

  return reply.status(StatusCodes.CREATED).send(result)
}

export async function parseStatementXlsxController(
  request: FastifyRequest<{ Params: AccountParams }>,
  reply: FastifyReply
) {
  const file = await request.file()

  if (!file) {
    return reply.status(StatusCodes.BAD_REQUEST).send({ message: 'No file uploaded' })
  }

  const buffer = await file.toBuffer()
  const fileName = file.filename ?? 'fatura.xlsx'
  const lowerName = fileName.toLowerCase()

  if (
    !file.mimetype?.includes('spreadsheet') &&
    !file.mimetype?.includes('excel') &&
    !file.mimetype?.includes('officedocument') &&
    !lowerName.endsWith('.xlsx')
  ) {
    return reply.status(StatusCodes.BAD_REQUEST).send({ message: 'File must be an XLSX' })
  }

  const result = await container.statementService.parseXlsx(
    request.organization.id,
    request.params.accountId,
    request.user.sub,
    buffer,
    fileName
  )

  return reply.send(result)
}

export async function parseStatementOfxController(
  request: FastifyRequest<{ Params: AccountParams }>,
  reply: FastifyReply
) {
  const file = await request.file()

  if (!file) {
    return reply.status(StatusCodes.BAD_REQUEST).send({ message: 'No file uploaded' })
  }

  const buffer = await file.toBuffer()
  const fileName = file.filename ?? 'fatura.ofx'
  const lowerName = fileName.toLowerCase()

  if (
    !file.mimetype?.includes('ofx') &&
    !file.mimetype?.includes('text/plain') &&
    !file.mimetype?.includes('application/x-ofx') &&
    !lowerName.endsWith('.ofx')
  ) {
    return reply.status(StatusCodes.BAD_REQUEST).send({ message: 'File must be an OFX' })
  }

  const content = buffer.toString('utf8')

  const result = await container.statementService.parseOfx(
    request.organization.id,
    request.params.accountId,
    request.user.sub,
    content,
    fileName
  )

  return reply.send(result)
}

export async function parseStatementOfxOrgController(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const file = await request.file()

  if (!file) {
    return reply.status(StatusCodes.BAD_REQUEST).send({ message: 'No file uploaded' })
  }

  const buffer = await file.toBuffer()
  const fileName = file.filename ?? 'fatura.ofx'
  const lowerName = fileName.toLowerCase()

  if (
    !file.mimetype?.includes('ofx') &&
    !file.mimetype?.includes('text/plain') &&
    !file.mimetype?.includes('application/x-ofx') &&
    !lowerName.endsWith('.ofx')
  ) {
    return reply.status(StatusCodes.BAD_REQUEST).send({ message: 'File must be an OFX' })
  }

  const content = buffer.toString('utf8')

  const result = await container.statementService.parseOfxForOrganization(
    request.organization.id,
    request.user.sub,
    content,
    fileName
  )

  return reply.send(result)
}
