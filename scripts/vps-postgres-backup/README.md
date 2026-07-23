# Cross-VPS Postgres backup (prod only)

Daily `pg_dump -Fc` of production databases on each VPS. Dumps are stored **only on the peer** (no local retention).

| Host | Peer | Container filter | PG user | Prod databases |
|------|------|------------------|---------|----------------|
| jarvis | ampliarme | `postgres_postgres` | `postgres` | `houseapp_v2` |
| ampliarme | jarvis | `estokai-infra_postgres` | `estokai` | `estokai_ruivas_stores`, `estokai_master_prod`, `estokai_la_vetrine` |

Homolog DBs are **not** backed up (`houseapp_hml`, `*_homolog`).

## Layout on each VPS

```
/opt/postgres-backup/backup.sh
/opt/postgres-backup/backup.env
/var/backups/postgres/jarvis/         # dumps received from jarvis (peer copy)
/var/backups/postgres/ampliarme/      # dumps received from ampliarme (peer copy)
/var/log/postgres-backup.log
```

Staging uses `/tmp` and is deleted after a successful upload.

## One-time setup

1. Mutual SSH between `ubuntu@jarvis` and `ubuntu@ampliarme` (ed25519, `~/.ssh/config` Host aliases).
2. Install:

```bash
sudo mkdir -p /opt/postgres-backup /var/backups/postgres/{jarvis,ampliarme}
sudo chown -R ubuntu:ubuntu /opt/postgres-backup /var/backups/postgres
sudo touch /var/log/postgres-backup.log
sudo chown ubuntu:ubuntu /var/log/postgres-backup.log

scp scripts/vps-postgres-backup/backup.sh ubuntu@HOST:/opt/postgres-backup/
# Write host-specific backup.env (see backup.env.example)
chmod +x /opt/postgres-backup/backup.sh
```

3. Cron — both VPS use `Etc/UTC`, so schedule at **06:00 / 06:15 UTC** (= 03:00 / 03:15 America/Sao_Paulo):

```cron
# jarvis
0 6 * * * /opt/postgres-backup/backup.sh >> /var/log/postgres-backup.log 2>&1

# ampliarme
15 6 * * * /opt/postgres-backup/backup.sh >> /var/log/postgres-backup.log 2>&1
```

4. Manual test: `/opt/postgres-backup/backup.sh`

## Restore example (houseapp_v2 from peer copy on ampliarme)

```bash
# On ampliarme — copy exists under /var/backups/postgres/jarvis/
scp ampliarme:/var/backups/postgres/jarvis/jarvis_houseapp_v2_YYYYMMDD_HHMMSS.dump /tmp/
CID=$(docker ps -q -f name=postgres_postgres | head -1)
docker cp /tmp/jarvis_houseapp_v2_YYYYMMDD_HHMMSS.dump "$CID":/tmp/restore.dump
docker exec -i "$CID" pg_restore -U postgres -d houseapp_v2 --clean --if-exists /tmp/restore.dump
```

Retention: **7 days** on the peer (`KEEP_DAYS` in `backup.env`).
