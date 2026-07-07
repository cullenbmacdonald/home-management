#!/bin/bash
# Deploy Homebase to the VPS.
#
# Usage:
#   ./infra/deploy.sh user@host [--init] [--prod] [-i identity_file]
#
# By default deploys to STAGING (staging.homebase.casa).
# Use --prod to promote to PRODUCTION (homebase.casa).
#
# Model: both environments run on one box from a single compose project,
# sharing one Postgres (two databases). The edge (ports 80/443 + TLS) is owned
# by the separate "platform" repo, whose shared Caddy proxies to these app
# containers over the external `edge` network. The image is built ON the box
# and tagged with the git commit. Staging runs the freshly built tag
# immediately; production only runs a commit that was already deployed to
# staging (promotion gate). No registry needed — both containers use the same
# Docker daemon.

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()   { echo -e "${GREEN}==>${NC} $1"; }
warn()  { echo -e "${YELLOW}warning:${NC} $1"; }
error() { echo -e "${RED}error:${NC} $1" >&2; exit 1; }

DEPLOY_TARGET="${DEPLOY_HOST:-}"
SSH_IDENTITY="${SSH_IDENTITY:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/homebase}"
INIT_MODE=false
PROD_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --init) INIT_MODE=true; shift ;;
        --prod) PROD_MODE=true; shift ;;
        -i)     SSH_IDENTITY="$2"; shift 2 ;;
        -*)     error "Unknown option: $1" ;;
        *)      DEPLOY_TARGET="$1"; shift ;;
    esac
done

if [[ -z "$DEPLOY_TARGET" ]]; then
    cat <<'USAGE'
Usage: ./infra/deploy.sh user@host [--init] [--prod] [-i identity_file]

Options:
  --init      First-time setup (create .env, generate secrets)
  --prod      Promote to production (default: staging)
  -i FILE     SSH identity file (private key)

Environment variables:
  DEPLOY_HOST   Default SSH target (e.g. deploy@203.0.113.10)
  DEPLOY_PATH   Remote path (default: /opt/homebase)
  SSH_IDENTITY  Default SSH identity file

Examples:
  ./infra/deploy.sh deploy@203.0.113.10 --init   # First-time setup
  ./infra/deploy.sh deploy@203.0.113.10          # Deploy to staging
  ./infra/deploy.sh deploy@203.0.113.10 --prod   # Promote to production
USAGE
    exit 1
fi

if [[ "$DEPLOY_TARGET" == *"@"* ]]; then
    DEPLOY_USER_HOST="$DEPLOY_TARGET"
else
    DEPLOY_USER_HOST="deploy@${DEPLOY_TARGET}"
fi

SSH_OPTS=""
[[ -n "$SSH_IDENTITY" ]] && SSH_OPTS="-i $SSH_IDENTITY"

if $PROD_MODE; then
    ENV_LABEL="production"; APP_SERVICE="homebase-app-prod"; TAG_VAR="PROD_IMAGE_TAG"; HEALTH_HOST="homebase.casa"
else
    ENV_LABEL="staging";    APP_SERVICE="homebase-app-staging"; TAG_VAR="STAGING_IMAGE_TAG"; HEALTH_HOST="staging.homebase.casa"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

log "Target: $DEPLOY_USER_HOST:$DEPLOY_PATH ($ENV_LABEL)"

log "Testing SSH connection..."
ssh $SSH_OPTS -o ConnectTimeout=10 "$DEPLOY_USER_HOST" "echo ok" >/dev/null 2>&1 \
    || error "Cannot connect to $DEPLOY_USER_HOST"

# --- Git version info ------------------------------------------------------
GIT_COMMIT_SHORT=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)
GIT_BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
IS_DIRTY=false
if ! git -C "$REPO_ROOT" diff --quiet 2>/dev/null || ! git -C "$REPO_ROOT" diff --cached --quiet 2>/dev/null; then
    IS_DIRTY=true
fi
if $IS_DIRTY; then GIT_COMMIT="${GIT_COMMIT_SHORT}-dirty"; else GIT_COMMIT="${GIT_COMMIT_SHORT}"; fi
log "Local commit: $GIT_COMMIT (branch: $GIT_BRANCH)"

# --- Production promotion gate ---------------------------------------------
if $PROD_MODE && ! $INIT_MODE; then
    log "Checking staging deployment hash..."
    STAGING_HASH=$(ssh $SSH_OPTS "$DEPLOY_USER_HOST" "cat $DEPLOY_PATH/.deployed-staging-hash 2>/dev/null" || echo "")
    [[ -z "$STAGING_HASH" ]] && error "No staging deployment found. Deploy to staging first."
    [[ "$STAGING_HASH" != "$GIT_COMMIT" ]] && \
        error "Commit mismatch: staging has '$STAGING_HASH' but local is '$GIT_COMMIT'. Deploy this commit to staging first."
    log "Staging matches local commit: $GIT_COMMIT"
fi

# --- Sync repo to the box (build context lives there) ----------------------
log "Syncing files to $DEPLOY_PATH ..."
ssh $SSH_OPTS "$DEPLOY_USER_HOST" bash <<EOF
    set -euo pipefail
    if [[ ! -d "$DEPLOY_PATH" ]]; then
        sudo mkdir -p "$DEPLOY_PATH"
        sudo chown \$USER:\$USER "$DEPLOY_PATH"
    fi
EOF

rsync -az --delete \
    -e "ssh $SSH_OPTS" \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'data' \
    --exclude 'infra/.env' \
    "$REPO_ROOT/" "$DEPLOY_USER_HOST:$DEPLOY_PATH/"

# --- First-time setup ------------------------------------------------------
if $INIT_MODE; then
    log "Running first-time setup..."
    ssh $SSH_OPTS "$DEPLOY_USER_HOST" bash <<ENDSSH
        set -euo pipefail
        cd "$DEPLOY_PATH/infra"
        if [[ ! -f .env ]]; then
            echo "Creating .env from template and generating secrets..."
            cp .env.example .env
            PG_PASS=\$(openssl rand -base64 24 | tr -d '\n/+=')
            U1_PASS=\$(openssl rand -base64 18 | tr -d '\n/+=')
            U2_PASS=\$(openssl rand -base64 18 | tr -d '\n/+=')
            CRON=\$(openssl rand -base64 24 | tr -d '\n/+=')
            sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=\$PG_PASS|" .env
            sed -i "s|^USER1_PASSWORD=.*|USER1_PASSWORD=\$U1_PASS|" .env
            sed -i "s|^USER2_PASSWORD=.*|USER2_PASSWORD=\$U2_PASS|" .env
            sed -i "s|^CRON_SECRET=.*|CRON_SECRET=\$CRON|" .env
            echo ""
            echo "=============================================================="
            echo ".env created at $DEPLOY_PATH/infra/.env"
            echo "First-boot login passwords (save these — shown once):"
            echo "  cullen: \$U1_PASS"
            echo "  madison:  \$U2_PASS"
            echo "=============================================================="
        else
            echo ".env already exists, leaving it untouched."
        fi
ENDSSH
    log "First-time setup complete."
    echo ""
    echo -e "${YELLOW}Next:${NC}"
    echo "  1. Point DNS A records at this box:"
    echo "       homebase.casa          -> <server IP>"
    echo "       staging.homebase.casa  -> <server IP>"
    echo "  2. Deploy to staging:  ./infra/deploy.sh $DEPLOY_USER_HOST"
    echo "  3. Promote to prod:    ./infra/deploy.sh $DEPLOY_USER_HOST --prod"
    exit 0
fi

# --- Build + deploy --------------------------------------------------------
log "Building image homebase:$GIT_COMMIT on the box and starting $ENV_LABEL..."
ssh $SSH_OPTS "$DEPLOY_USER_HOST" bash <<ENDSSH
    set -euo pipefail
    cd "$DEPLOY_PATH"

    [[ -f infra/.env ]] || { echo "infra/.env not found. Run with --init first."; exit 1; }

    # Build the image only if this commit isn't already built (staging builds;
    # prod reuses the tag staging already produced).
    if ! docker image inspect "homebase:$GIT_COMMIT" >/dev/null 2>&1; then
        echo "Building homebase:$GIT_COMMIT ..."
        docker build -t "homebase:$GIT_COMMIT" .
    else
        echo "Image homebase:$GIT_COMMIT already present, skipping build."
    fi

    cd infra

    # Pin this environment to the freshly built tag.
    sed -i "/^${TAG_VAR}=/d" .env
    echo "${TAG_VAR}=$GIT_COMMIT" >> .env

    # Bring up shared services (postgres) without disturbing them, then
    # recreate just this environment's app container.
    docker compose up -d --remove-orphans --no-recreate postgres
    docker compose up -d --force-recreate --no-deps $APP_SERVICE

    # Wait for the app to answer locally. Any HTTP response line means the
    # server is up — the app redirects / to /login (307), so we must NOT treat
    # a non-2xx status as failure (wget -O /dev/null would).
    echo "Waiting for $APP_SERVICE to respond..."
    for i in \$(seq 1 30); do
        if docker compose exec -T $APP_SERVICE wget -S -O /dev/null http://localhost:3000/ 2>&1 | grep -q "HTTP/"; then
            echo "$APP_SERVICE is up after \$((i*2))s"; break
        fi
        [[ \$i -eq 30 ]] && echo "WARNING: $APP_SERVICE did not respond within 60s"
        sleep 2
    done

    docker compose ps
ENDSSH

# Record the staging hash for the production promotion gate.
if ! $PROD_MODE; then
    ssh $SSH_OPTS "$DEPLOY_USER_HOST" "echo '$GIT_COMMIT' > '$DEPLOY_PATH/.deployed-staging-hash'"
    log "Recorded staging hash: $GIT_COMMIT"
fi

# --- Public health check ---------------------------------------------------
log "Checking https://$HEALTH_HOST ..."
for i in $(seq 1 30); do
    if curl -sfk "https://$HEALTH_HOST/" >/dev/null 2>&1; then
        log "$ENV_LABEL is live at https://$HEALTH_HOST"
        break
    fi
    if [[ $i -eq 30 ]]; then
        warn "Could not reach https://$HEALTH_HOST within 60s (TLS may still be provisioning on first deploy)."
        warn "Check logs: ssh $SSH_OPTS $DEPLOY_USER_HOST 'cd $DEPLOY_PATH/infra && docker compose logs -f $APP_SERVICE'"
    fi
    sleep 2
done

log "Deployment complete! ($ENV_LABEL)"
