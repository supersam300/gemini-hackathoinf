#!/usr/bin/env sh
set -eu

echo "[startup] launching ollama on ${OLLAMA_HOST:-127.0.0.1:11434}"
ollama serve >/tmp/ollama-runtime.log 2>&1 &
OLLAMA_PID=$!

cleanup() {
  echo "[shutdown] stopping ollama"
  kill "${OLLAMA_PID}" >/dev/null 2>&1 || true
}
trap cleanup INT TERM EXIT

echo "[startup] waiting for ollama readiness"
i=0
while [ "$i" -lt 60 ]; do
  if ollama list >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 1
done

if [ "${OLLAMA_PULL_ON_START:-false}" = "true" ]; then
  echo "[startup] ensuring model exists: ${OLLAMA_MODEL:-gemma3:latest}"
  ollama pull "${OLLAMA_MODEL:-gemma3:latest}" || true
fi

echo "[startup] starting api server"
exec node server/index.js
