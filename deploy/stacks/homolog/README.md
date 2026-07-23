# Homolog stack — wake on demand

Homolog (`houseapp-homolog`) keeps a tiny **gate** always running. API and web start at **0 replicas** and only scale up when someone hits:

- https://app.homolog.jarvis.dev.br
- https://api.homolog.jarvis.dev.br

After **10 minutes** without requests, the gate scales API + web back to 0.

## What stays up

| Service | Replicas | Notes |
|---------|----------|--------|
| `houseapp-homolog_gate` | 1 | Always on (~64MB). Traefik routes homolog hosts here. |
| `houseapp-homolog_api` / `_web` | 0 → 1 on demand | Idle timeout 10m |
| `postgres_postgres` | 1 | **Shared with prod — never scaled down by the gate** |

## Cold start

First visit after idle shows a short “iniciando…” page and refreshes automatically. Expect ~30–60s until the app responds.

## Manual override

```bash
# Keep homolog up (gate idle timer will still scale down after 10m without traffic)
docker service scale houseapp-homolog_api=1 houseapp-homolog_web=1

# Force sleep now
docker service scale houseapp-homolog_api=0 houseapp-homolog_web=0
```

## Gate env (stack defaults)

- `IDLE_MS=600000` — idle before scale to 0
- `SCALE_SERVICES` — allowlist only (`houseapp-homolog_api,houseapp-homolog_web`)
- Upstream hosts via Swarm DNS (`tasks.houseapp-homolog_*`)
