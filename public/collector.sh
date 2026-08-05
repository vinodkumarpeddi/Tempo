#!/bin/bash
# claude-team-usage collector — runs every 10 min via launchd/cron.
# Reads the local Claude Code OAuth token, fetches usage percentages from
# Anthropic, and reports them to the team server. The token never leaves
# this machine; only utilization numbers are sent.
set -u

CONFIG_DIR="$HOME/.claude-usage-collector"
CONFIG_FILE="$CONFIG_DIR/config"

[ -f "$CONFIG_FILE" ] || { echo "no config at $CONFIG_FILE" >&2; exit 1; }
# shellcheck disable=SC1090
. "$CONFIG_FILE"   # provides SERVER_URL and INGEST_KEY

[ -n "${SERVER_URL:-}" ] && [ -n "${INGEST_KEY:-}" ] || { echo "config missing SERVER_URL/INGEST_KEY" >&2; exit 1; }

# Member identity headers (set by the installer; lets one shared team key
# serve everyone).
ID_HEADERS=()
if [ -n "${MEMBER_EMAIL:-}" ]; then
  ID_HEADERS=(-H "x-member-email: $MEMBER_EMAIL" -H "x-member-name: ${MEMBER_NAME:-}")
fi

# 1. Ask the server whether a report is due (admin controls the interval).
cfg=$(curl -sf --max-time 15 -H "Authorization: Bearer $INGEST_KEY" "${ID_HEADERS[@]}" "$SERVER_URL/api/collector/config") || exit 0
case "$cfg" in
  *'"reportDue":true'*) ;;
  *) exit 0 ;;
esac

# 2. Read the Claude Code OAuth token (Keychain on macOS, file on Linux).
creds=""
if [ "$(uname)" = "Darwin" ]; then
  creds=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null || true)
fi
if [ -z "$creds" ] && [ -f "$HOME/.claude/.credentials.json" ]; then
  creds=$(cat "$HOME/.claude/.credentials.json")
fi
[ -n "$creds" ] || { echo "no Claude Code credentials found" >&2; exit 1; }

if command -v python3 >/dev/null 2>&1; then
  token=$(printf '%s' "$creds" | python3 -c "import sys,json; print(json.load(sys.stdin)['claudeAiOauth']['accessToken'])" 2>/dev/null)
else
  token=$(printf '%s' "$creds" | sed -n 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
fi
[ -n "$token" ] || { echo "could not extract accessToken" >&2; exit 1; }

# 3. Fetch usage. On rate-limit or error, just wait for the next tick.
# The Authorization header arrives via stdin (-H @-) so the token never
# appears in the process list.
usage=$(printf 'Authorization: Bearer %s\n' "$token" | curl -s --max-time 20 \
  -H @- \
  -H "anthropic-beta: oauth-2025-04-20" \
  https://api.anthropic.com/api/oauth/usage) || exit 0

case "$usage" in
  ""|*rate_limit_error*|*authentication_error*) exit 0 ;;
esac

# 4. Report to the team server (raw payload; the server does the parsing).
curl -sf --max-time 15 -X POST \
  -H "Authorization: Bearer $INGEST_KEY" \
  -H "Content-Type: application/json" \
  "${ID_HEADERS[@]}" \
  --data "$usage" \
  "$SERVER_URL/api/ingest" >/dev/null || echo "report failed" >&2
