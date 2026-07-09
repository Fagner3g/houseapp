# TODOs de Inconsistências do Projeto

Lista de pendências técnicas e legado remanescente. Atualizado após o redesign financeiro (jun/2026).

Legenda: `[x]` resolvido · `[ ]` pendente

---

## Documentação

- [x] Reescrever `docs/EXPLICACAO_PROJETO.md` para o modelo centrado em contas/transações.
- [x] Criar `docs/README.md` como índice da pasta.
- [x] Atualizar status de implementação em `docs/PLANO_REDESIGN_FINANCEIRO.md`.
- [ ] Atualizar `README.md` na raiz (ainda cita metas, roadmap desatualizado).
- [ ] Remover ou arquivar referências a `goals`, `tags`, `series/occurrences` fora de docs históricos.

---

## Backend — legado HTTP

- [x] Mover relatórios de `jobs.routes.ts` para `api/src/modules/reports/`.
- [ ] Remover schemas órfãos em `api/src/http/schemas/transaction/` (chat, installments legados, etc.).
- [ ] Remover schemas órfãos em `api/src/http/schemas/alerts/` se não forem mais registrados.
- [ ] Avaliar remoção de `api/src/domain/ai/portfolio-context.ts` (investments antigo).
- [ ] Consolidar helpers de recorrência: `api/src/domain/recurrence/` vs `api/src/modules/recurring/`.

---

## Backend — jobs e segurança

- [ ] Proteger endpoints `/jobs/*` (maioria sem `authenticateUserHook` hoje).
- [ ] Mover jobs administrativos para prefixo `/internal/` com API key, conforme plano.
- [ ] Separar claramente jobs de produto (materialização, alertas) de endpoints de operação manual.

---

## Contrato API ↔ frontend

- [x] Reports expostos em rotas dedicadas (`/reports/summary`, `/by-account`, `/by-category`).
- [ ] Regenerar e limpar `web/src/api/generated/` — remover tipos de investments/reminders obsoletos.
- [ ] Documentar no fluxo de dev: alterou rota/schema → subir API (Swagger) → Orval watch regenera cliente.
- [ ] CI: checagem de divergência entre `api/swagger.json` e rotas registradas.

---

## Frontend

- [x] Home card-based em `/{org}` substituindo dashboard antigo.
- [x] Navegação com Dashboard, Lançamentos, Contas, Configurações.
- [x] Redirect `/{org}/dashboard` → `/{org}`.
- [ ] Corrigir `modal-new-organization` que ainda navega para `/{slug}/dashboard`.
- [ ] Implementar Quick Create compacto (FAB popover) antes do drawer completo — previsto no plano UX.
- [ ] Bottom tab bar mobile + sidebar slim 56px — previsto no plano UX.
- [ ] Toggle lista/calendário na página de transações.

---

## Extensão Chrome

- [x] Simplificar popup (~300 linhas, foco em pendências/vencidas).
- [ ] Alinhar popup com novos endpoints de reports/notifications se ainda usar rotas antigas.
- [ ] Pipeline de build mínimo ou documentar deploy manual da extensão.

---

## Produto / redesign

- [ ] Skill Cursor para parsing de PDF por instituição (dev).
- [x] Import de fatura: parcelas, tipo por linha (pagamento/estorno vs compra) e resumo no `statements` (migration `0001_crazy_vulture.sql`).
- [ ] Transferências entre contas (`transfer_pair_id` no schema, fluxo UI/API).
- [ ] Open Finance: adicionar `source = 'open_finance'` e campos em `accounts` quando priorizado.
- [ ] Expandir tools do chat IA (`import_statement`, `create_split`, etc.) além do que já existe.

### Import de fatura PDF

- [x] Schema e API aceitam `installmentNumber`/`installmentsTotal` e `type` (`income`|`expense`) por transação importada.
- [x] `statements` guarda resumo da fatura (`previousBalance`, `paymentsReceived`, `purchasesTotal`, `otherCharges`, `nextInvoiceBalance`, `totalOpenBalance`).
- [ ] Fatura Nubank consolidada não traz 4 dígitos do cartão por linha — `cardLastFour` permanece opcional no import; transações ficam sem `card_id` quando o PDF não informa.

---

## Bootstrap e infraestrutura

- [ ] Revisar criação automática de banco no startup — comportamento desejado em produção.
- [ ] Documentar variáveis de storage (local vs S3) para anexos em `api/src/config/env.ts`.
- [x] Ignorar `api/dist` no versionamento.

---

## Testes

- [ ] Cobertura mínima para módulos críticos: transactions, splits, statements import, reports.
- [ ] Testes de integração para fluxo pay + materialização de recorrências.

---

## Verificações rápidas (comando mental)

Ao revisar PR, conferir:

1. Schema/migration bate com `api/src/db/schemas/`?
2. Nova rota está em `api/src/modules/` e registrada em `routes/index.ts`?
3. Swagger regenerado e Orval atualizado?
4. Feature web usa hooks gerados, não endpoints hardcoded legados?
5. Docs em `docs/` refletem o comportamento exposto ao usuário?
