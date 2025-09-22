# Sistema de Jobs

Sistema centralizado e organizado para gerenciar jobs agendados (cron jobs) da aplicação.

## 🏗️ Arquitetura

```
jobs/
├── types.ts              # Interfaces e tipos
├── config.ts             # Configurações dos jobs
├── job-manager.ts        # Gerenciador de jobs (node-cron)
├── registry.ts           # Registry centralizado (ciclo de vida)
├── utils.ts              # Utilitários para jobs
├── index.ts              # API pública
├── transactions.ts       # Job de relatórios
├── transactions-to-owner.ts # Job de digest
├── materialize-occurrences.ts # Job de materialização
└── README.md             # Esta documentação
```

## 🚀 Como Usar

### Inicialização Automática
Os jobs são inicializados automaticamente quando o servidor inicia:

```typescript
// Em server.ts
await registerJobs() // Inicializa todos os jobs
```

### Execução Manual
```typescript
import { runJobNow, getJobsStatus } from '@/jobs'

// Executar um job específico
const result = await runJobNow('reports:all-owners')

// Ver status de todos os jobs
const status = getJobsStatus()
```

### Controle de Jobs
```typescript
import { 
  stopAllJobs, 
  jobExists, 
  getJobInfo,
  getSystemStats 
} from '@/jobs'

// Verificar se job existe
if (jobExists('reports:all-owners')) {
  // Fazer algo
}

// Obter informações do job
const info = getJobInfo('reports:all-owners')

// Estatísticas do sistema
const stats = getSystemStats()
```

## 📋 Jobs Disponíveis

| Job | Chave | Schedule | Descrição |
|-----|-------|----------|-----------|
| **Relatórios** | `reports:all-owners` | Dia 5, 10:00 | Envia relatórios via WhatsApp |
| **Digest** | `reports:owner-digest` | Dia 5, 10:00 | Envia digest consolidado |
| **Materialização** | `transactions:materialize` | Diário, 03:00 | Gera ocorrências futuras |

## 🔧 Criando um Novo Job

### 1. Definir Configuração
```typescript
// Em config.ts
export const JOB_CONFIGS = {
  // ... outros jobs
  MEU_NOVO_JOB: {
    key: 'meu:novo-job',
    schedule: '0 9 * * *', // Todo dia às 09:00
    timezone: 'America/Sao_Paulo',
    description: 'Meu novo job personalizado'
  }
}
```

### 2. Implementar a Função
```typescript
// Em meu-novo-job.ts
import { jobManager } from './job-manager'
import { JOB_CONFIGS } from './config'
import type { JobResult } from './types'

async function meuNovoJob(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    // Sua lógica aqui
    processed++
    
    return {
      success: errors === 0,
      processed,
      errors,
      duration: Date.now() - startTime
    }
  } catch {
    return {
      success: false,
      processed,
      errors: errors + 1,
      duration: Date.now() - startTime
    }
  }
}

// Registrar o job
jobManager.registerJob(JOB_CONFIGS.MEU_NOVO_JOB, meuNovoJob)

// Export para execução manual
export async function runMeuNovoJobNow() {
  return await jobManager.runJobNow(JOB_CONFIGS.MEU_NOVO_JOB.key)
}
```

### 3. Importar no Index
```typescript
// Em index.ts
import './meu-novo-job' // Adicionar esta linha
```

## 📊 Monitoramento

### Logs Estruturados
O sistema gera logs estruturados para cada execução:

```
✅ Job concluído: Relatórios de transações
  - Processados: 5
  - Erros: 0
  - Duração: 2.3s
```

### Status dos Jobs
```typescript
const status = getJobsStatus()
// Retorna array com informações detalhadas de cada job
```

### Estatísticas do Sistema
```typescript
const stats = getSystemStats()
// {
//   totalJobs: 3,
//   runningJobs: 3,
//   uptime: 3600000,
//   isInitialized: true
// }
```

## 🛠️ Utilitários

### Formatação de Duração
```typescript
import { formatDuration } from '@/jobs/utils'

formatDuration(1500) // "1.5s"
formatDuration(90000) // "1.5min"
```

### Retry com Backoff
```typescript
import { retryWithBackoff } from '@/jobs/utils'

const result = await retryWithBackoff(
  () => minhaFuncaoCritica(),
  3, // max tentativas
  1000 // delay base em ms
)
```

## 🔄 Shutdown Gracioso

O sistema para todos os jobs automaticamente quando o servidor recebe sinais de encerramento:

```typescript
// Em server.ts
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
```

## 🧪 Testes

Para testes, você pode reinicializar o sistema:

```typescript
import { reinitializeJobs } from '@/jobs'

// Reinicializar (para testes)
await reinitializeJobs()
```

## 📝 Boas Práticas

1. **Sempre retorne `JobResult`** com métricas precisas
2. **Use try-catch** para capturar erros individuais
3. **Continue processando** mesmo com erros parciais
4. **Log estruturado** para facilitar monitoramento
5. **Teste execução manual** antes de agendar
6. **Use timezone consistente** (America/Sao_Paulo)
7. **Documente o propósito** de cada job

## 🚨 Troubleshooting

### Job não está executando
1. Verificar se foi registrado: `getJobsStatus()`
2. Verificar configuração: `getJobInfo(jobKey)`
3. Verificar logs de inicialização

### Erro na execução
1. Executar manualmente: `runJobNow(jobKey)`
2. Verificar logs estruturados
3. Verificar dependências (banco, APIs externas)

### Performance
1. Monitorar duração nos logs
2. Usar `formatDuration()` para análise
3. Considerar otimizações se necessário
