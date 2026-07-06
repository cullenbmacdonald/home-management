# Homebase Infrastructure

Staging + production for Homebase, both on a **single VPS**, from **one Docker
Compose project**.

```
┌──────────────────────── VPS ────────────────────────┐
│                                                      │
│   ┌─────────┐   homebase.casa          ┌──────────┐  │
│   │  Caddy  │──────────────────────────│ app-prod │──┐
│   │ :80/443 │   staging.homebase.casa  └──────────┘  │ │
│   │         │──────────────┐           ┌──────────┐  │ │
│   └─────────┘              └───────────│app-staging│─┤ │
│                                        └──────────┘  │ │
│                                    ┌──────────────┐  │ │
│                                    │  postgres    │◀─┴─┘
│                                    │  homebase          (prod db)
│                                    │  homebase_staging  (staging db)
│                                    └──────────────┘  │
└──────────────────────────────────────────────────────┘
```

- **Caddy** terminates TLS (auto Let's Encrypt) for both domains and proxies
  each to its app container.
- **postgres** is one shared instance holding two databases. `init-db.sql`
  creates the staging database on first boot.
- **app-prod / app-staging** are the same Next.js image, each pinned to an
  independent tag (`PROD_IMAGE_TAG` / `STAGING_IMAGE_TAG`) and pointed at its
  own database, uploads volume, and `MCP_BASE_URL`.

The app runs its own DB migrations + first-run seed on boot (Next.js
instrumentation), so there's no separate migration step.

## First-time setup

1. **DNS** — point both records at the box:
   ```
   homebase.casa          -> <server IP>
   staging.homebase.casa  -> <server IP>
   ```
   Ensure the firewall allows 80 and 443.

2. **Init** — syncs the repo to `/opt/homebase`, creates `infra/.env`, and
   generates secrets (Postgres password, both users' first-boot passwords,
   `CRON_SECRET`). It prints the login passwords once — save them.
   ```bash
   ./infra/deploy.sh deploy@<server IP> --init -i ~/.ssh/yourkey
   ```

3. **Deploy staging**, verify, then **promote to prod**:
   ```bash
   ./infra/deploy.sh deploy@<server IP>          # -> staging.homebase.casa
   ./infra/deploy.sh deploy@<server IP> --prod   # -> homebase.casa
   ```

## Everyday deploys

```bash
./infra/deploy.sh deploy@<server IP>          # deploy current commit to staging
./infra/deploy.sh deploy@<server IP> --prod   # promote that same commit to prod
```

Production **refuses** to deploy a commit that wasn't deployed to staging
first (the hash is recorded in `/opt/homebase/.deployed-staging-hash`). Commit
your work before deploying prod, or the `-dirty` tag will block promotion.

## How the image tagging works

- Staging deploy builds `homebase:<commit>` on the box and sets
  `STAGING_IMAGE_TAG=<commit>`.
- Prod deploy reuses the already-built `homebase:<commit>` (same Docker
  daemon, no registry) and sets `PROD_IMAGE_TAG=<commit>`.
- Both tags live in `infra/.env`; deploy.sh manages them — don't edit by hand.

## Operations (run from `/opt/homebase/infra` on the box)

```bash
docker compose ps                       # status of all services
docker compose logs -f app-prod         # prod app logs
docker compose logs -f app-staging      # staging app logs
docker compose logs -f caddy            # TLS / proxy logs
docker compose exec postgres psql -U homebase homebase          # prod DB shell
docker compose exec postgres psql -U homebase homebase_staging  # staging DB shell
docker compose restart caddy            # reload proxy
```

### Backups

```bash
docker compose exec -T postgres pg_dump -U homebase homebase          > prod-$(date +%F).sql
docker compose exec -T postgres pg_dump -U homebase homebase_staging  > staging-$(date +%F).sql
```

## Files

| File | Purpose |
|------|---------|
| `deploy.sh`          | Deploy script (run from your laptop) |
| `docker-compose.yml` | Both environments + shared Caddy & Postgres |
| `Caddyfile`          | Reverse proxy + automatic TLS |
| `init-db.sql`        | Creates the staging database on first boot |
| `.env.example`       | Environment template (copied to `.env` by `--init`) |

## Notes / migrating off the old host

- The app previously ran at `homebase.cullenmacdonald.com`. To carry its data
  over: `pg_dump` the old database and `psql` it into the new `homebase`
  database, and copy the old `/data` uploads into the `homebase-data-prod`
  volume, before the first prod deploy serves traffic.
- The root `docker-compose.yml` is the old single-service standalone file. It's
  superseded by this one for the VPS; keep it only if you still use it for
  local one-off runs.
