#!/bin/bash
# claude-team-usage collector installer.
# Usage: curl -sSL https://<server>/install.sh | bash -s -- <SERVER_URL> <INGEST_KEY>
set -eu

SERVER_URL="${1:-}"
INGEST_KEY="${2:-}"
[ -n "$SERVER_URL" ] && [ -n "$INGEST_KEY" ] || {
  echo "usage: install.sh <SERVER_URL> <INGEST_KEY>" >&2; exit 1;
}
SERVER_URL="${SERVER_URL%/}"

CONFIG_DIR="$HOME/.claude-usage-collector"
mkdir -p "$CONFIG_DIR"

curl -sSf "$SERVER_URL/collector.sh" -o "$CONFIG_DIR/collector.sh"
chmod +x "$CONFIG_DIR/collector.sh"

umask 077
cat > "$CONFIG_DIR/config" <<EOF
SERVER_URL="$SERVER_URL"
INGEST_KEY="$INGEST_KEY"
EOF

if [ "$(uname)" = "Darwin" ]; then
  PLIST="$HOME/Library/LaunchAgents/com.claude-team-usage.collector.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.claude-team-usage.collector</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$CONFIG_DIR/collector.sh</string>
  </array>
  <key>StartInterval</key><integer>600</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>$CONFIG_DIR/collector.log</string>
</dict>
</plist>
EOF
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load "$PLIST"
  echo "Installed launchd agent (every 10 min tick; server decides when to report)."
  echo "NOTE: the first run may show a Keychain prompt for 'Claude Code-credentials' — click 'Always Allow'."
else
  TMP_CRON=$(mktemp)
  crontab -l 2>/dev/null | grep -v "claude-usage-collector" > "$TMP_CRON" || true
  echo "*/10 * * * * /bin/bash $CONFIG_DIR/collector.sh # claude-usage-collector" >> "$TMP_CRON"
  crontab "$TMP_CRON"
  rm -f "$TMP_CRON"
  echo "Installed crontab entry (every 10 min tick; server decides when to report)."
fi

"$CONFIG_DIR/collector.sh" && echo "First report sent." || echo "First run did not report (may be rate-limited); it will retry automatically."
