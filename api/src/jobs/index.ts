// Importar todos os jobs para registrar automaticamente
import './materialize-occurrences'
import './transaction-alerts'

// Importar o registry
import { jobRegistry } from './registry'

// Exportar componentes principais
export { JOB_CONFIGS } from './config'
export { jobManager } from './job-manager'
export { jobRegistry } from './registry'
export type { JobConfig, JobFunction, JobResult } from './types'

/**
 * Registra e inicializa todos os jobs do sistema
 * Agora usa o JobRegistry para melhor controle
 */
export async function registerJobs(): Promise<void> {
  await jobRegistry.initialize()
}

/**
 * Para todos os jobs (útil para shutdown gracioso)
 */
export function stopAllJobs(): void {
  jobRegistry.stopAllJobs()
}

/**
 * Para um job específico
 */
export function stopJob(jobKey: string): void {
  jobRegistry.stopJob(jobKey)
}

/**
 * Inicia um job específico
 */
export function startJob(jobKey: string): void {
  jobRegistry.startJob(jobKey)
}

/**
 * Inicia todos os jobs (apenas os que estão parados)
 */
export function startAllJobs(): void {
  jobRegistry.startAllJobs()
}

/**
 * Executa um job específico manualmente
 */
export async function runJobNow(jobKey: string) {
  return await jobRegistry.runJob(jobKey)
}

/**
 * Retorna o status de todos os jobs
 */
export function getJobsStatus() {
  return jobRegistry.getJobsStatus()
}

/**
 * Valida se um job existe
 */
export function jobExists(jobKey: string): boolean {
  return jobRegistry.jobExists(jobKey)
}

/**
 * Retorna informações detalhadas de um job
 */
export function getJobInfo(jobKey: string) {
  return jobRegistry.getJobInfo(jobKey)
}

/**
 * Retorna estatísticas do sistema de jobs
 */
export function getSystemStats() {
  return jobRegistry.getSystemStats()
}

/**
 * Reinicializa o sistema de jobs (útil para testes)
 */
export async function reinitializeJobs(): Promise<void> {
  await jobRegistry.reinitialize()
}
