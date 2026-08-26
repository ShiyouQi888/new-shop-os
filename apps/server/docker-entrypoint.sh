#!/bin/sh
set -e

mkdir -p "$(dirname "${DB_FILE:-/data/shop-os.db}")" "${UPLOAD_DIR:-/uploads}"

if [ "${AUTO_SEED:-1}" = "1" ]; then
  echo "[entrypoint] running idempotent seed"
  node -e "import('./dist/db/seed.js').then(m => m.seed()).then(() => console.log('[entrypoint] seed finished')).catch(e => { console.error('[entrypoint] seed failed', e); process.exit(1) })"
fi

echo "[entrypoint] starting shop-os server"
exec node dist/index.js
