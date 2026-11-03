#!/bin/sh
set -e

mkdir -p "${UPLOAD_DIR:-/uploads}"

echo "[entrypoint] starting shop-os server"
exec node dist/index.js
