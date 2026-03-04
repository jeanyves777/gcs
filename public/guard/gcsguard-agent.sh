#!/bin/bash
# ============================================================
# GcsGuard Agent — AI-Powered Security Monitoring
# General Computing Solutions (itatgcs.com)
#
# Monitors: system metrics, SSH auth, file integrity,
#           suspicious processes, network devices
# Reports to GCS portal via HTTPS API
# ============================================================

set -euo pipefail

CONF="/etc/gcsguard/agent.conf"
LOG="/var/log/gcsguard/agent.log"
BASELINE="/etc/gcsguard/baselines.sha256"
PID_FILE="/var/run/gcsguard.pid"

# Load config
if [[ ! -f "$CONF" ]]; then
  echo "ERROR: Config not found at $CONF" >&2
  exit 1
fi
source "$CONF"

: "${API_KEY:?API_KEY not set in $CONF}"
: "${API_URL:?API_URL not set in $CONF}"
HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-30}"
INTEGRITY_INTERVAL="${INTEGRITY_INTERVAL:-300}"
NETWORK_SCAN_INTERVAL="${NETWORK_SCAN_INTERVAL:-600}"

# State
LAST_INTEGRITY_CHECK=0
LAST_NETWORK_SCAN=0
FAILED_SSH_COUNT=0
FAILED_SSH_WINDOW_START=0
declare -A ALERTED_TYPES

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

# ============================================================
# METRICS COLLECTION
# ============================================================

collect_metrics() {
  local cpu mem disk load_avg net_in net_out

  # CPU usage
  cpu=$(top -bn1 2>/dev/null | grep "Cpu(s)" | awk '{print $2 + $4}' || echo "0")

  # Memory usage
  mem=$(free 2>/dev/null | awk '/Mem:/ {printf "%.1f", $3/$2*100}' || echo "0")

  # Disk usage (root partition)
  disk=$(df / 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}' || echo "0")

  # Load average (1 min)
  load_avg=$(cat /proc/loadavg 2>/dev/null | awk '{print $1}' || echo "0")

  # Network I/O (bytes since boot on primary interface)
  local iface
  iface=$(ip route 2>/dev/null | grep default | awk '{print $5}' | head -1 || echo "eth0")
  net_in=$(cat /proc/net/dev 2>/dev/null | grep "$iface" | awk '{print $2}' || echo "0")
  net_out=$(cat /proc/net/dev 2>/dev/null | grep "$iface" | awk '{print $10}' || echo "0")

  echo "{\"cpu\":${cpu},\"memory\":${mem},\"disk\":${disk},\"load\":${load_avg},\"network_in\":${net_in},\"network_out\":${net_out}}"
}

collect_system_info() {
  local hostname os kernel ip uptime_secs
  hostname=$(hostname -f 2>/dev/null || hostname)
  os=$(lsb_release -ds 2>/dev/null || cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || echo "Linux")
  kernel=$(uname -r)
  ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")
  uptime_secs=$(cat /proc/uptime 2>/dev/null | awk '{print int($1)}' || echo "0")
  echo "{\"hostname\":\"${hostname}\",\"os\":\"${os}\",\"kernel\":\"${kernel}\",\"ip\":\"${ip}\",\"uptime\":${uptime_secs}}"
}

# ============================================================
# SECURITY MONITORING
# ============================================================

check_failed_ssh() {
  local now alerts="[]"
  now=$(date +%s)

  # Reset window every 60 seconds
  if (( now - FAILED_SSH_WINDOW_START > 60 )); then
    FAILED_SSH_COUNT=0
    FAILED_SSH_WINDOW_START=$now
  fi

  # Count recent failed SSH attempts
  local recent_fails
  recent_fails=$(journalctl -u ssh --since "1 minute ago" --no-pager 2>/dev/null | grep -c "Failed password\|Failed publickey\|Invalid user" || true)
  FAILED_SSH_COUNT=$((FAILED_SSH_COUNT + recent_fails))

  if (( FAILED_SSH_COUNT >= 5 )) && [[ -z "${ALERTED_TYPES[BRUTE_FORCE]:-}" ]]; then
    local evidence
    evidence=$(journalctl -u ssh --since "5 minutes ago" --no-pager 2>/dev/null | grep -i "failed\|invalid" | tail -10 | sed 's/"/\\"/g' | tr '\n' '|')
    alerts="[{\"type\":\"BRUTE_FORCE\",\"severity\":\"HIGH\",\"title\":\"SSH Brute Force Detected\",\"description\":\"${FAILED_SSH_COUNT} failed SSH login attempts in the last 60 seconds\",\"evidence\":{\"log_lines\":\"${evidence}\",\"count\":${FAILED_SSH_COUNT}}}]"
    ALERTED_TYPES[BRUTE_FORCE]=$now
    log "ALERT: SSH brute force detected — $FAILED_SSH_COUNT attempts"
  fi

  # Clear alert cooldown after 5 min
  if [[ -n "${ALERTED_TYPES[BRUTE_FORCE]:-}" ]] && (( now - ${ALERTED_TYPES[BRUTE_FORCE]} > 300 )); then
    unset ALERTED_TYPES[BRUTE_FORCE]
  fi

  echo "$alerts"
}

check_suspicious_processes() {
  local alerts="[]" now
  now=$(date +%s)

  # Check for crypto miners
  local miners
  miners=$(ps aux 2>/dev/null | grep -iE "xmrig|minerd|cpuminer|cryptonight|stratum" | grep -v grep || true)
  if [[ -n "$miners" ]] && [[ -z "${ALERTED_TYPES[MALWARE]:-}" ]]; then
    local evidence
    evidence=$(echo "$miners" | head -5 | sed 's/"/\\"/g' | tr '\n' '|')
    alerts="[{\"type\":\"MALWARE\",\"severity\":\"CRITICAL\",\"title\":\"Crypto Miner Process Detected\",\"description\":\"Suspected cryptocurrency mining process running on server\",\"evidence\":{\"processes\":\"${evidence}\"}}]"
    ALERTED_TYPES[MALWARE]=$now
    log "ALERT: Crypto miner detected"
  fi

  # Check for reverse shells
  local revshells
  revshells=$(ps aux 2>/dev/null | grep -E "nc\s+-e|bash\s+-i|/dev/tcp/|ncat.*-e|socat.*exec" | grep -v grep || true)
  if [[ -n "$revshells" ]] && [[ -z "${ALERTED_TYPES[SUSPICIOUS_PROCESS]:-}" ]]; then
    local evidence
    evidence=$(echo "$revshells" | head -5 | sed 's/"/\\"/g' | tr '\n' '|')
    alerts=$(echo "$alerts" | sed 's/\]$//' | sed 's/$/,/')
    alerts="${alerts}{\"type\":\"SUSPICIOUS_PROCESS\",\"severity\":\"CRITICAL\",\"title\":\"Possible Reverse Shell Detected\",\"description\":\"Process resembling a reverse shell found running\",\"evidence\":{\"processes\":\"${evidence}\"}}]"
    ALERTED_TYPES[SUSPICIOUS_PROCESS]=$now
    log "ALERT: Possible reverse shell detected"
  fi

  echo "$alerts"
}

# ============================================================
# FILE INTEGRITY MONITORING
# ============================================================

CRITICAL_FILES=(
  /etc/passwd /etc/shadow /etc/group /etc/sudoers
  /etc/ssh/sshd_config /etc/crontab /etc/hosts
  /etc/resolv.conf /etc/pam.d/sshd
  /root/.bashrc /root/.ssh/authorized_keys
)

init_baselines() {
  local tmpfile="${BASELINE}.tmp"
  > "$tmpfile"
  for f in "${CRITICAL_FILES[@]}"; do
    if [[ -f "$f" ]]; then
      sha256sum "$f" >> "$tmpfile" 2>/dev/null || true
    fi
  done
  mv "$tmpfile" "$BASELINE"
  log "File integrity baselines initialized (${#CRITICAL_FILES[@]} files)"
}

check_file_integrity() {
  local alerts="[]"

  if [[ ! -f "$BASELINE" ]]; then
    init_baselines
    return
  fi

  local changes=""
  while IFS= read -r line; do
    local hash file
    hash=$(echo "$line" | awk '{print $1}')
    file=$(echo "$line" | awk '{print $2}')
    if [[ -f "$file" ]]; then
      local current_hash
      current_hash=$(sha256sum "$file" 2>/dev/null | awk '{print $1}')
      if [[ "$current_hash" != "$hash" ]]; then
        changes="${changes}${file} (hash changed)|"
        log "ALERT: File changed — $file"
      fi
    else
      changes="${changes}${file} (deleted)|"
      log "ALERT: Critical file deleted — $file"
    fi
  done < "$BASELINE"

  if [[ -n "$changes" ]]; then
    changes=$(echo "$changes" | sed 's/"/\\"/g')
    alerts="[{\"type\":\"FILE_CHANGE\",\"severity\":\"HIGH\",\"title\":\"Critical File Modification Detected\",\"description\":\"One or more critical system files have been modified\",\"evidence\":{\"changes\":\"${changes}\"}}]"
    # Re-baseline after reporting
    init_baselines
  fi

  echo "$alerts"
}

# ============================================================
# NETWORK DEVICE DISCOVERY
# ============================================================

scan_network_devices() {
  local devices="[]"

  # Get local subnet
  local subnet
  subnet=$(ip route 2>/dev/null | grep -v default | grep "src" | head -1 | awk '{print $1}' || echo "")
  if [[ -z "$subnet" ]]; then
    echo "$devices"
    return
  fi

  # ARP scan (uses ping sweep + arp table)
  # Ping sweep the subnet (background, quick)
  local base
  base=$(echo "$subnet" | cut -d'/' -f1 | sed 's/\.[0-9]*$//')
  for i in $(seq 1 254); do
    ping -c 1 -W 1 "${base}.${i}" &>/dev/null &
  done
  wait 2>/dev/null || true
  sleep 1

  # Read ARP table
  local arp_output
  arp_output=$(arp -an 2>/dev/null | grep -v incomplete || ip neigh 2>/dev/null | grep -v FAILED || true)

  local device_array=""
  while IFS= read -r line; do
    local ip mac
    if echo "$line" | grep -q "ether"; then
      ip=$(echo "$line" | grep -oP '\d+\.\d+\.\d+\.\d+' | head -1)
      mac=$(echo "$line" | grep -oiP '([0-9a-f]{2}:){5}[0-9a-f]{2}' | head -1)
    else
      ip=$(echo "$line" | grep -oP '\d+\.\d+\.\d+\.\d+' | head -1)
      mac=$(echo "$line" | grep -oiP '([0-9a-f]{2}:){5}[0-9a-f]{2}' | head -1)
    fi

    if [[ -n "$mac" && "$mac" != "00:00:00:00:00:00" && -n "$ip" ]]; then
      local hostname vendor dtype
      hostname=$(getent hosts "$ip" 2>/dev/null | awk '{print $2}' || echo "")

      # OUI vendor lookup from MAC prefix
      local oui="${mac:0:8}"
      vendor=""
      dtype="UNKNOWN"

      # Common vendor OUI prefixes for device type detection
      case "${oui^^}" in
        00:1A:2B|00:17:C5|00:1D:AA|3C:8A:B0) vendor="Cisco"; dtype="ROUTER" ;;
        00:1B:78|E4:AA:5D|FC:15:B4) vendor="Hewlett-Packard"; dtype="PRINTER" ;;
        80:2A:A8|24:A4:3C|44:19:B6) vendor="Ubiquiti"; dtype="WIFI_AP" ;;
        00:15:65|80:5E:C0|7C:2F:80) vendor="Yealink"; dtype="IP_PHONE" ;;
        B8:27:EB|DC:A6:32|E4:5F:01) vendor="Raspberry Pi"; dtype="IOT" ;;
        28:6C:07|A4:CF:12|60:01:94) vendor="Xiaomi"; dtype="IOT" ;;
        AC:BC:32|D8:6C:63) vendor="Apple"; dtype="WORKSTATION" ;;
        *) vendor="" ; dtype="UNKNOWN" ;;
      esac

      if [[ -n "$device_array" ]]; then device_array="${device_array},"; fi
      device_array="${device_array}{\"mac\":\"${mac}\",\"ip\":\"${ip}\",\"hostname\":\"${hostname}\",\"vendor\":\"${vendor}\",\"type\":\"${dtype}\"}"
    fi
  done <<< "$arp_output"

  echo "[${device_array}]"
}

# ============================================================
# COMMAND EXECUTION
# ============================================================

execute_commands() {
  local commands="$1"
  local results="[]"

  if [[ "$commands" == "[]" || -z "$commands" ]]; then
    echo "[]"
    return
  fi

  # Parse each command (basic JSON parsing with jq if available, fallback to grep)
  local count
  count=$(echo "$commands" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

  for ((i=0; i<count; i++)); do
    local cmd_id cmd_type payload output status
    cmd_id=$(echo "$commands" | python3 -c "import sys,json; print(json.load(sys.stdin)[$i]['id'])" 2>/dev/null)
    cmd_type=$(echo "$commands" | python3 -c "import sys,json; print(json.load(sys.stdin)[$i]['type'])" 2>/dev/null)
    payload=$(echo "$commands" | python3 -c "import sys,json; d=json.load(sys.stdin)[$i]['payload']; print(json.dumps(d))" 2>/dev/null)

    log "Executing command: $cmd_type ($cmd_id)"

    case "$cmd_type" in
      BLOCK_IP)
        local ip
        ip=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ip',''))" 2>/dev/null)
        if [[ -n "$ip" ]]; then
          output=$(ufw deny from "$ip" 2>&1 || iptables -A INPUT -s "$ip" -j DROP 2>&1)
          status="COMPLETED"
        else
          output="No IP provided"
          status="FAILED"
        fi
        ;;
      UNBLOCK_IP)
        local ip
        ip=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ip',''))" 2>/dev/null)
        if [[ -n "$ip" ]]; then
          output=$(ufw delete deny from "$ip" 2>&1 || iptables -D INPUT -s "$ip" -j DROP 2>&1)
          status="COMPLETED"
        else
          output="No IP provided"
          status="FAILED"
        fi
        ;;
      KILL_PROCESS)
        local pid
        pid=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('pid',''))" 2>/dev/null)
        if [[ -n "$pid" ]]; then
          output=$(kill -9 "$pid" 2>&1)
          status="COMPLETED"
        else
          output="No PID provided"
          status="FAILED"
        fi
        ;;
      RESTART_SERVICE)
        local service
        service=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('service',''))" 2>/dev/null)
        if [[ -n "$service" ]]; then
          output=$(systemctl restart "$service" 2>&1)
          status="COMPLETED"
        else
          output="No service provided"
          status="FAILED"
        fi
        ;;
      RUN_SCAN)
        output="Scan initiated"
        status="COMPLETED"
        ;;
      NETWORK_SCAN)
        output="Network scan triggered"
        LAST_NETWORK_SCAN=0  # Force immediate scan
        status="COMPLETED"
        ;;
      *)
        output="Unknown command type: $cmd_type"
        status="FAILED"
        ;;
    esac

    log "Command $cmd_id ($cmd_type): $status"
    if [[ -n "$(echo "$results" | grep -o '{' | head -1)" ]]; then
      results=$(echo "$results" | sed 's/\]$/,/')
    else
      results="["
    fi
    output=$(echo "$output" | sed 's/"/\\"/g' | head -5 | tr '\n' ' ')
    results="${results}{\"id\":\"${cmd_id}\",\"status\":\"${status}\",\"output\":\"${output}\"}]"
  done

  echo "$results"
}

# ============================================================
# HEARTBEAT
# ============================================================

send_heartbeat() {
  local metrics system_info ssh_alerts proc_alerts integrity_alerts
  local all_alerts="[]" devices="[]" cmd_results="[]"

  metrics=$(collect_metrics)
  system_info=$(collect_system_info)

  # Security checks
  ssh_alerts=$(check_failed_ssh)
  proc_alerts=$(check_suspicious_processes)

  # Merge alerts
  all_alerts="$ssh_alerts"
  if [[ "$proc_alerts" != "[]" ]]; then
    if [[ "$all_alerts" == "[]" ]]; then
      all_alerts="$proc_alerts"
    else
      all_alerts=$(echo "$all_alerts" | sed 's/\]$//')","$(echo "$proc_alerts" | sed 's/^\[//')
    fi
  fi

  # File integrity check (every INTEGRITY_INTERVAL seconds)
  local now
  now=$(date +%s)
  if (( now - LAST_INTEGRITY_CHECK >= INTEGRITY_INTERVAL )); then
    integrity_alerts=$(check_file_integrity)
    LAST_INTEGRITY_CHECK=$now
    if [[ "$integrity_alerts" != "[]" ]]; then
      if [[ "$all_alerts" == "[]" ]]; then
        all_alerts="$integrity_alerts"
      else
        all_alerts=$(echo "$all_alerts" | sed 's/\]$//')","$(echo "$integrity_alerts" | sed 's/^\[//')
      fi
    fi
  fi

  # Network device scan (every NETWORK_SCAN_INTERVAL seconds)
  if (( now - LAST_NETWORK_SCAN >= NETWORK_SCAN_INTERVAL )); then
    devices=$(scan_network_devices)
    LAST_NETWORK_SCAN=$now
  fi

  # Build payload
  local payload
  payload="{\"metrics\":${metrics},\"systemInfo\":${system_info},\"alerts\":${all_alerts},\"devices\":${devices},\"commandResults\":${cmd_results}}"

  # Send heartbeat
  local response
  response=$(curl -sS -X POST "${API_URL}/heartbeat" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    --max-time 10 2>&1) || {
    log "ERROR: Heartbeat failed — $response"
    return
  }

  # Process commands from response
  local commands
  commands=$(echo "$response" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('commands',[])))" 2>/dev/null || echo "[]")

  if [[ "$commands" != "[]" ]]; then
    log "Received ${commands} commands"
    cmd_results=$(execute_commands "$commands")
    # Send command results in next heartbeat (stored for next iteration)
    # For immediate feedback, send a follow-up
    if [[ "$cmd_results" != "[]" ]]; then
      curl -sS -X POST "${API_URL}/heartbeat" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"metrics\":${metrics},\"systemInfo\":${system_info},\"alerts\":[],\"devices\":[],\"commandResults\":${cmd_results}}" \
        --max-time 10 &>/dev/null || true
    fi
  fi
}

# ============================================================
# EMAIL NOTIFICATION (via GCS API)
# ============================================================

send_urgent_alert() {
  local type="$1" severity="$2" title="$3" description="$4" evidence="$5"

  curl -sS -X POST "${API_URL}/alert" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"${type}\",\"severity\":\"${severity}\",\"title\":\"${title}\",\"description\":\"${description}\",\"evidence\":${evidence:-null}}" \
    --max-time 10 &>/dev/null || log "ERROR: Failed to send urgent alert"
}

# ============================================================
# MAIN LOOP
# ============================================================

main() {
  echo "$BASHPID" > "$PID_FILE"
  log "GcsGuard Agent starting (PID: $BASHPID)"
  log "API URL: ${API_URL}"
  log "Heartbeat interval: ${HEARTBEAT_INTERVAL}s"
  log "Integrity check interval: ${INTEGRITY_INTERVAL}s"
  log "Network scan interval: ${NETWORK_SCAN_INTERVAL}s"

  # Initialize file integrity baselines on first run
  if [[ ! -f "$BASELINE" ]]; then
    init_baselines
  fi

  # Signal handlers
  trap 'log "Agent stopping"; rm -f "$PID_FILE"; exit 0' SIGTERM SIGINT

  while true; do
    send_heartbeat &>/dev/null || log "Heartbeat cycle failed"
    sleep "$HEARTBEAT_INTERVAL"
  done
}

main "$@"
