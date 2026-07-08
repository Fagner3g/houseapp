# Migração de Produção: schema legado → v2

Produção (`houseapp`) ainda usa o schema legado (`invites.user_id`, `user_organizations`, `transactions_series`, etc.). O código v2 exige schema incompatível (`invites.invited_by`, `organization_members`, `transactions`, `notifications`, etc.).

**Não faça deploy de `main` com o código v2 até concluir esta migração.**

## Pré-requisitos

- Backup completo do banco `houseapp` na VPS
- Janela de manutenção (downtime ou troca de banco)
- Validar homolog com schema v2 antes de replicar em prod

## Opção A — Banco novo (recomendado se dados de teste ou migração manual)

1. Criar banco `houseapp_v2` no PostgreSQL da VPS
2. Atualizar `/opt/stacks/houseapp/prod/api.env`:
   ```bash
   DB_NAME=houseapp_v2
   ```
3. Rodar migrações (na mesma rede overlay do Postgres; use `DB_HOST=postgres` no api.env).
   `network_swarm_public` não é attachable para `docker run` — use um service one-shot:
   ```bash
   MIGRATE_SVC=houseapp_migrate
   docker service rm "$MIGRATE_SVC" 2>/dev/null || true
   docker service create \
     --name "$MIGRATE_SVC" \
     --network network_swarm_public \
     --restart-condition none \
     --env-file /opt/stacks/houseapp/prod/api.env \
     --with-registry-auth \
     ghcr.io/fagner3g/houseapp-api:<TAG> \
     sh -c "yarn db:migrate"
   # Aguardar CurrentState=Complete, conferir logs, depois:
   docker service rm "$MIGRATE_SVC"
   ```
4. Migrar dados do legado com script dedicado (usuários, organizações, transações) ou importar dump transformado
5. Deploy da stack prod com a nova imagem
6. Validar: sign-in (email/WhatsApp), transações, alertas, jobs

## Opção B — Reset de homolog/prod não-crítico

Para ambientes sem necessidade de preservar dados:

```bash
docker service scale houseapp_api=0   # ou houseapp-homolog_api=0

docker exec postgres_postgres.1.<id> psql -U postgres -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'houseapp' AND pid <> pg_backend_pid();
  DROP DATABASE IF EXISTS houseapp;
  CREATE DATABASE houseapp;
"

# Migrações + seed (ver deploy/env/README.md)
```

## Checklist pós-migração

- [ ] `invites` possui coluna `invited_by` (não `user_id`)
- [ ] Tabela `notifications` existe
- [ ] `drizzle.__drizzle_migrations` tem apenas entradas do journal v2 (2 migrações)
- [ ] `POST /sign-in` retorna `200` para email e telefone
- [ ] Jobs `alerts:evaluate` e `alerts:send-whatsapp` sem erros de SQL
- [ ] `BREVO_API_KEY` válida para envio de e-mail

## Rollback

- Manter banco `houseapp` legado intacto até validação completa
- Reverter `DB_NAME` e imagem da API para versão anterior se necessário
- `docker service update --image ghcr.io/fagner3g/houseapp-api:<TAG_ANTERIOR> houseapp_api`
