#!/bin/bash
# ============================================================
# GcsGuard Agent Installer
# Usage: curl -sSL https://itatgcs.com/guard/install.sh | sudo bash -s -- <API_KEY>
# ============================================================

set -euo pipefail

API_KEY="${1:-}"
API_URL="${2:-https://itatgcs.com/api/guard/agent}"
AGENT_NAME="${3:-$(hostname -f 2>/dev/null || hostname)}"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}
  ╔══════════════════════════════════════════╗
  ║        GcsGuard Agent Installer          ║
  ║    AI-Powered Security Monitoring        ║
  ║    General Computing Solutions           ║
  ╚══════════════════════════════════════════╝
${NC}"

# Validate
if [[ -z "$API_KEY" ]]; then
  echo -e "${RED}ERROR: API key required${NC}"
  echo "Usage: curl -sSL https://itatgcs.com/guard/install.sh | sudo bash -s -- <API_KEY>"
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}ERROR: Must run as root (use sudo)${NC}"
  exit 1
fi

echo -e "${GREEN}[1/6]${NC} Creating directories..."
mkdir -p /etc/gcsguard /var/log/gcsguard

echo -e "${GREEN}[2/6]${NC} Installing dependencies..."
if command -v apt-get &>/dev/null; then
  apt-get update -qq 2>/dev/null
  apt-get install -y -qq unattended-upgrades curl python3 2>/dev/null || true
elif command -v dnf &>/dev/null; then
  dnf install -y -q dnf-automatic curl python3 2>/dev/null || true
elif command -v yum &>/dev/null; then
  yum install -y -q yum-cron curl python3 2>/dev/null || true
fi

echo -e "${GREEN}[3/6]${NC} Writing configuration..."
cat > /etc/gcsguard/agent.conf << EOF
# GcsGuard Agent Configuration
API_KEY="${API_KEY}"
API_URL="${API_URL}"
AGENT_NAME="${AGENT_NAME}"
HEARTBEAT_INTERVAL=30
INTEGRITY_INTERVAL=300
NETWORK_SCAN_INTERVAL=600
EOF
chmod 600 /etc/gcsguard/agent.conf

echo -e "${GREEN}[4/6]${NC} Downloading agent..."
curl -sSL "https://itatgcs.com/guard/gcsguard-agent.sh" -o /usr/local/bin/gcsguard-agent
chmod +x /usr/local/bin/gcsguard-agent

echo -e "${GREEN}[5/6]${NC} Creating systemd service..."
cat > /etc/systemd/system/gcsguard.service << 'EOF'
[Unit]
Description=GcsGuard Security Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/gcsguard-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gcsguard

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}[6/6]${NC} Starting agent..."
systemctl daemon-reload
systemctl enable gcsguard
systemctl start gcsguard

sleep 2

if systemctl is-active --quiet gcsguard; then
  echo -e "
${GREEN}════════════════════════════════════════════${NC}
${GREEN}  GcsGuard Agent installed successfully!${NC}
${GREEN}════════════════════════════════════════════${NC}

  Status:  $(systemctl is-active gcsguard)
  Config:  /etc/gcsguard/agent.conf
  Logs:    journalctl -u gcsguard -f
  Agent:   /usr/local/bin/gcsguard-agent

  The agent is now monitoring this server and
  reporting to the GCS Security Operations Center.
"
else
  echo -e "${RED}WARNING: Agent may not have started correctly${NC}"
  echo "Check: journalctl -u gcsguard --no-pager -n 20"
fi
