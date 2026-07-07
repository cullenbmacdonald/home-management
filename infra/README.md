# Homebase Infrastructure

Staging + production for Homebase, both on a **single VPS**, from **one Docker
Compose project**. This project runs only the **app tier** (Postgres + the two
Next.js app containers). The **edge** — ports 80/443, TLS, and hostname routing
— is owned by a separate **platform** repo whose shared Caddy proxies to these
containers by name over an external Docker network named `edge`.

```
┌──────────────────────── VPS ────────────────────────────────┐
│                                                              │
│  platform repo (separate compose project)                    │
│   ┌─────────┐   homebase.casa          ┌───────────────────┐ │
│   │  Caddy  │──────────────────────────│ homebase-app-prod │─┐│
│   │ :80/443 │   staging.homebase.casa  └───────────────────┘ ││
│   │  (edge) │────────────┐   ┌────────────────────────────┐  ││
│   └─────────┘            └───│    homebase-app-staging     │──┤│
│      via external `edge` net └────────────────────────────┘  ││
│                                    ┌──────────────┐          ││
│                                    │  postgres    │◀─────────┴┘
│                                    │  homebase          (prod db)
│                                    │  homebase_staging  (staging db)
│                                    │  (private `homebase` net only)
│                                    └──────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

- **Edge / TLS** live in the platform repo, not here. Its Caddy terminates TLS
  (auto Let's Encrypt) for both domains and reverse-proxies each hostname to the
  matching app container (`homebase-app-prod:3000` / `homebase-app-staging:3000`)
  over the shared `edge` network. DNS and certs are handled there too.
- **postgres** is one shared instance holding two databases, on the private
  `homebase` network **only** (never on the edge). `init-db.sql` creates the
  staging database on first boot.
- **homebase-app-prod / homebase-app-staging** are the same Next.js image, each
  pinned to an independent tag (`PROD_IMAGE_TAG` / `STAGING_IMAGE_TAG`) and
  pointed at its own database, uploads volume, and `MCP_BASE_URL`. Both are
  attached to `[homebase, edge]` so the platform Caddy can reach them.

The app runs its own DB migrations + first-run seed on boot (Next.js
instrumentation), so there's no separate migration step.

> **Prerequisites:** the external `edge` network and the platform (its Caddy)
> must exist before deploying. Create the network once on the box with
> `docker network create edge`, and deploy the platform repo so something is
> serving 80/443. Without them the app containers still run but nothing proxies
> to them.

## First-time setup

1. **Edge + DNS** — DNS and the firewall (ports 80/443) are handled by the
   platform repo. Make sure the external network and platform Caddy exist on the
   box before deploying homebase:
   ```
   docker network create edge      # once, idempotent
   # then deploy the platform repo so its Caddy owns 80/443 + TLS
   ```
   DNS records (`homebase.casa`, `staging.homebase.casa` -> server IP) point at
   the platform Caddy.

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
docker compose ps                              # status of all services
docker compose logs -f homebase-app-prod       # prod app logs
docker compose logs -f homebase-app-staging    # staging app logs
docker compose exec postgres psql -U homebase homebase          # prod DB shell
docker compose exec postgres psql -U homebase homebase_staging  # staging DB shell
# TLS / proxy logs live in the platform repo (its Caddy owns the edge).
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
| `docker-compose.yml` | Both app environments + shared Postgres (edge lives in the platform repo) |
| `init-db.sql`        | Creates the staging database on first boot |
| `.env.example`       | Environment template (copied to `.env` by `--init`) |

## Notes

- The app previously ran at `homebase.cullenmacdonald.com` (a separate
  single-box deployment). It was retired and **no data was migrated** — prod at
  `homebase.casa` was seeded fresh (`cullen` + `madison`). If you ever need to
  carry data between hosts: `pg_dump` the source DB → `psql` into the target
  `homebase` DB, and copy `/data` uploads into the `homebase-data-prod` volume,
  before the target prod deploy serves traffic.
- The root `docker-compose.yml` is the old single-service standalone file. It's
  superseded by this one for the VPS; keep it only if you still use it for
  local one-off runs.
