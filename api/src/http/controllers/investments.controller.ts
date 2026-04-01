import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { investmentService } from '@/domain/investments'

export async function listInvestmentAssetsController(req: FastifyRequest, reply: FastifyReply) {
  const assets = await investmentService.listAssets(req.user.sub)
  reply.status(StatusCodes.OK).send({ assets })
}

export async function getInvestmentQuotePreviewController(
  req: FastifyRequest<{ Querystring: { symbol: string; assetClass?: string } }>,
  reply: FastifyReply
) {
  const preview = await investmentService.previewQuote(req.query.symbol, req.query.assetClass)
  reply.status(StatusCodes.OK).send({ preview })
}

export async function createInvestmentAssetController(
  req: FastifyRequest<{ Body: { symbol: string; displayName: string; assetClass: string; quotePreference: 'auto' | 'manual' | 'auto_with_manual_fallback'; notes?: string } }>,
  reply: FastifyReply
) {
  const asset = await investmentService.createAsset(req.user.sub, req.body)
  reply.status(StatusCodes.CREATED).send({ asset: { id: asset.id } })
}

export async function updateInvestmentAssetController(
  req: FastifyRequest<{
    Params: { assetId: string }
    Body: {
      symbol?: string
      displayName?: string
      assetClass?: string
      quotePreference?: 'auto' | 'manual' | 'auto_with_manual_fallback'
      notes?: string
      isActive?: boolean
    }
  }>,
  reply: FastifyReply
) {
  const asset = await investmentService.updateAsset(req.user.sub, req.params.assetId, req.body)
  reply.status(StatusCodes.OK).send({ asset: { id: asset.id } })
}

export async function deleteInvestmentAssetController(
  req: FastifyRequest<{ Params: { assetId: string } }>,
  reply: FastifyReply
) {
  await investmentService.deleteAsset(req.user.sub, req.params.assetId)
  reply.status(StatusCodes.NO_CONTENT).send()
}

export async function setInvestmentQuoteController(
  req: FastifyRequest<{ Params: { assetId: string }; Body: { price: bigint } }>,
  reply: FastifyReply
) {
  const quote = await investmentService.saveManualQuote(req.user.sub, req.params.assetId, req.body.price)
  reply.status(StatusCodes.OK).send({ quote: { id: quote.id } })
}

export async function listInvestmentPlansController(req: FastifyRequest, reply: FastifyReply) {
  const plans = await investmentService.listPlans(req.user.sub)
  reply.status(StatusCodes.OK).send({ plans })
}

export async function createInvestmentPlanController(
  req: FastifyRequest<{
    Body: {
      assetId: string
      mode: 'amount' | 'quantity'
      progressionType: 'fixed' | 'linear_step'
      initialAmount?: bigint
      initialQuantity?: number
      stepAmount?: bigint
      stepQuantity?: number
      startDate: Date
      endDate?: Date
      active?: boolean
    }
  }>,
  reply: FastifyReply
) {
  const plan = await investmentService.createPlan(req.user.sub, req.body)
  reply.status(StatusCodes.CREATED).send({ plan: { id: plan.id } })
}

export async function updateInvestmentPlanController(
  req: FastifyRequest<{
    Params: { planId: string }
    Body: {
      assetId?: string
      mode?: 'amount' | 'quantity'
      progressionType?: 'fixed' | 'linear_step'
      initialAmount?: bigint
      initialQuantity?: number
      stepAmount?: bigint
      stepQuantity?: number
      startDate?: Date
      endDate?: Date
      active?: boolean
    }
  }>,
  reply: FastifyReply
) {
  const plan = await investmentService.updatePlan(req.user.sub, req.params.planId, req.body)
  reply.status(StatusCodes.OK).send({ plan: { id: plan.id } })
}

export async function deleteInvestmentPlanController(
  req: FastifyRequest<{ Params: { planId: string } }>,
  reply: FastifyReply
) {
  await investmentService.deletePlan(req.user.sub, req.params.planId)
  reply.status(StatusCodes.NO_CONTENT).send()
}

export async function createInvestmentExecutionController(
  req: FastifyRequest<{
    Body: {
      assetId: string
      planId?: string
      referenceMonth: string
      investedAmount: bigint
      executedQuantity: number
      executedUnitPrice: bigint
      executedAt?: Date
    }
  }>,
  reply: FastifyReply
) {
  const execution = await investmentService.registerExecution(req.user.sub, {
    ...req.body,
    executedAt: req.body.executedAt ?? new Date(),
  })
  reply.status(StatusCodes.CREATED).send({ execution: { id: execution.id } })
}

export async function updateInvestmentExecutionController(
  req: FastifyRequest<{
    Params: { executionId: string }
    Body: {
      assetId: string
      planId?: string
      referenceMonth: string
      investedAmount: bigint
      executedQuantity: number
      executedUnitPrice: bigint
      executedAt?: Date
    }
  }>,
  reply: FastifyReply
) {
  const execution = await investmentService.updateExecution(req.user.sub, req.params.executionId, {
    ...req.body,
    executedAt: req.body.executedAt ?? new Date(),
  })
  reply.status(StatusCodes.OK).send({ execution: { id: execution.id } })
}

export async function deleteInvestmentExecutionController(
  req: FastifyRequest<{ Params: { executionId: string } }>,
  reply: FastifyReply
) {
  await investmentService.deleteExecution(req.user.sub, req.params.executionId)
  reply.status(StatusCodes.NO_CONTENT).send()
}

export async function getInvestmentRemindersController(req: FastifyRequest, reply: FastifyReply) {
  const reminders = await investmentService.getReminders(req.user.sub)
  reply.status(StatusCodes.OK).send({ reminders })
}

export async function getInvestmentDashboardController(req: FastifyRequest, reply: FastifyReply) {
  const dashboard = await investmentService.getDashboard(req.user.sub)
  reply.status(StatusCodes.OK).send({ dashboard })
}
