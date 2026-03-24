# TODOs de Inconsistências do Projeto

## Rotas e organização do backend

- [ ] Mover as rotas de relatórios/dashboards que hoje estão em `api/src/http/routes/jobs.routes.ts` para `api/src/http/routes/reports.routes.ts`.
- [ ] Atualizar `api/src/http/routes/index.ts` para registrar explicitamente o módulo de relatórios, em vez de concentrar esse comportamento em rotas de jobs.
- [ ] Separar responsabilidades em `api/src/http/controllers/jobs.controller.ts`, extraindo controllers de relatórios para um arquivo dedicado.
- [ ] Revisar nomes de arquivos, exports e responsabilidades para que "jobs" trate apenas agendamento/execução de jobs e "reports" trate apenas agregações de dashboard.

## Contrato entre API e frontend

- [ ] Confirmar que todos os endpoints expostos no `swagger.json` correspondem à organização atual das rotas do backend.
- [ ] Regenerar o cliente do Orval após a reorganização das rotas para evitar contrato obsoleto em `web/src/api/generated`.
- [ ] Documentar no fluxo de desenvolvimento que mudanças em rotas/schemas da API exigem atualização do Swagger e do cliente gerado.
- [ ] Avaliar se arquivos gerados por Orval devem ser versionados do jeito atual ou se o processo deve ser mais explícito no CI.

## Estrutura e clareza do domínio

- [ ] Documentar formalmente a diferença entre `transactionSeries` e `transactionOccurrences`, porque esse é um conceito central e pode confundir quem entra no projeto.
- [ ] Padronizar nomenclatura entre "transaction", "series", "occurrence", "installment" e "report" para reduzir ambiguidade entre backend e frontend.
- [ ] Revisar se os nomes dos campos e tipos expostos ao frontend deixam claro quando o recurso representa uma série e quando representa uma ocorrência.

## Bootstrap e infraestrutura da API

- [ ] Revisar se a criação automática do banco no startup deve continuar como comportamento padrão em todos os ambientes.
- [ ] Separar melhor as responsabilidades de `setupDatabase()` entre verificação de conexão, criação de banco e execução de migrações.
- [ ] Garantir que o comportamento de boot em produção esteja claramente documentado, principalmente quando falhar conexão, ausência de migrações ou falta de permissões.

## Jobs e produto

- [ ] Revisar o acoplamento atual entre jobs administrativos e funcionalidades de produto, principalmente onde jobs também expõem relatórios e resumos.
- [ ] Definir uma fronteira clara entre endpoints de operação/administração de jobs e endpoints consumidos diretamente pela interface do usuário.
- [ ] Verificar se os previews e resumos mensais pertencem mesmo ao módulo de jobs ou se devem migrar para módulos de reporting/notifications.

## Documentação e onboarding

- [ ] Atualizar o `README.md` para refletir a arquitetura real do monorepo, incluindo `chrome-extension`, jobs e cliente gerado por Orval.
- [ ] Adicionar um guia curto de navegação do projeto apontando os arquivos centrais de backend, frontend e domínio financeiro.
- [ ] Documentar o fluxo completo: backend gera Swagger, frontend consome via Orval, e ambos precisam permanecer sincronizados.

## Verificações técnicas recomendadas

- [ ] Criar testes para garantir que rotas de relatórios continuem disponíveis após a reorganização dos módulos HTTP.
- [ ] Criar uma checagem simples no CI para detectar divergência entre `api/swagger.json` e o código atual da API.
- [ ] Validar se existem endpoints no cliente gerado que já não possuem implementação ou que estão registrados em módulos semanticamente errados.
