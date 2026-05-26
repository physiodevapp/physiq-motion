#!/usr/bin/env bash
set -e

PORT=3000

# Kill any existing server on the port
fuser -k ${PORT}/tcp 2>/dev/null || true

# Start static server in background
npx --yes serve . --listen ${PORT} > /tmp/physiq-serve.log 2>&1 &
echo "Servidor arrancado en http://localhost:${PORT}"

# Open tunnel and print URL
echo "Abriendo túnel..."
ssh -o StrictHostKeyChecking=no \
    -o ConnectTimeout=15 \
    -o ServerAliveInterval=30 \
    -R 80:localhost:${PORT} \
    serveo.net
