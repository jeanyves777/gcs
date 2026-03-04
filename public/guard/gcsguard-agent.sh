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
LAST_SERVICE_CHECK=0
SERVICE_CHECK_INTERVAL=1800
FAILED_SSH_COUNT=0
FAILED_SSH_WINDOW_START=0
declare -A ALERTED_TYPES
CACHED_SERVICE_STATUSES="[]"

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
  local hostname os kernel ip uptime_secs distro distro_version pkg_manager
  hostname=$(hostname -f 2>/dev/null || hostname)
  os=$(lsb_release -ds 2>/dev/null || cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || echo "Linux")
  kernel=$(uname -r)
  ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")
  uptime_secs=$(cat /proc/uptime 2>/dev/null | awk '{print int($1)}' || echo "0")

  # Distro info from /etc/os-release
  distro=""
  distro_version=""
  if [[ -f /etc/os-release ]]; then
    distro=$(. /etc/os-release && echo "${ID:-unknown}")
    distro_version=$(. /etc/os-release && echo "${VERSION_ID:-unknown}")
  fi

  # Package manager detection
  pkg_manager=$(detect_package_manager)

  echo "{\"hostname\":\"${hostname}\",\"os\":\"${os}\",\"kernel\":\"${kernel}\",\"ip\":\"${ip}\",\"uptime\":${uptime_secs},\"distro\":\"${distro}\",\"distroVersion\":\"${distro_version}\",\"packageManager\":\"${pkg_manager}\"}"
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
# PATCH MANAGEMENT
# ============================================================

detect_package_manager() {
  if command -v apt-get &>/dev/null; then
    echo "apt"
  elif command -v dnf &>/dev/null; then
    echo "dnf"
  elif command -v yum &>/dev/null; then
    echo "yum"
  else
    echo "unknown"
  fi
}

collect_packages_apt() {
  log "Collecting upgradable packages (apt)"

  # Update package lists quietly
  DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>/dev/null || true

  # Get upgradable packages
  local raw_list
  raw_list=$(apt list --upgradable 2>/dev/null | grep -v "^Listing" || true)

  if [[ -z "$raw_list" ]]; then
    echo "[]"
    return
  fi

  # Check for security updates list
  local security_packages=""
  if [[ -f /var/lib/apt/lists/*security*Packages 2>/dev/null ]] || apt-get upgrade -s 2>/dev/null | grep -qi "security"; then
    security_packages=$(apt-get upgrade -s 2>/dev/null | grep -i "^Inst" | grep -i "security" | awk '{print $2}' || true)
  fi

  # Parse each line: package/source version [arch] (new_version)
  local packages="["
  local first=true
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue

    local name current_ver new_ver is_security

    # Format: name/source current_version arch [upgradable from: old_version]
    name=$(echo "$line" | awk -F'/' '{print $1}')
    new_ver=$(echo "$line" | awk '{print $2}')
    current_ver=$(echo "$line" | grep -oP 'upgradable from: \K[^\]]+' || echo "unknown")
    current_ver=$(echo "$current_ver" | tr -d ']')

    # Check if this is a security update
    is_security="false"
    if echo "$security_packages" | grep -qx "$name" 2>/dev/null; then
      is_security="true"
    fi
    if echo "$line" | grep -qi "security"; then
      is_security="true"
    fi

    if [[ "$first" == "true" ]]; then
      first=false
    else
      packages="${packages},"
    fi
    packages="${packages}{\"name\":\"${name}\",\"version\":\"${current_ver}\",\"newVersion\":\"${new_ver}\",\"isSecurityUpdate\":${is_security}}"
  done <<< "$raw_list"

  packages="${packages}]"
  echo "$packages"
}

collect_packages_yum() {
  log "Collecting upgradable packages (yum/dnf)"

  local pkg_cmd
  if command -v dnf &>/dev/null; then
    pkg_cmd="dnf"
  else
    pkg_cmd="yum"
  fi

  # Check for updates
  local raw_list
  raw_list=$($pkg_cmd check-update 2>/dev/null | awk 'NF==3 && $1 !~ /^(Loaded|Last|$)/ {print $1,$2}' || true)

  if [[ -z "$raw_list" ]]; then
    echo "[]"
    return
  fi

  # Check for security updates
  local security_packages=""
  security_packages=$($pkg_cmd updateinfo list security 2>/dev/null | awk '{print $3}' || true)

  local packages="["
  local first=true
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue

    local name new_ver current_ver is_security

    name=$(echo "$line" | awk '{print $1}' | sed 's/\.\(x86_64\|noarch\|i686\|aarch64\)$//')
    new_ver=$(echo "$line" | awk '{print $2}')

    # Get currently installed version
    current_ver=$(rpm -q "$name" --queryformat '%{VERSION}-%{RELEASE}' 2>/dev/null || echo "unknown")

    is_security="false"
    if echo "$security_packages" | grep -q "$name" 2>/dev/null; then
      is_security="true"
    fi

    if [[ "$first" == "true" ]]; then
      first=false
    else
      packages="${packages},"
    fi
    packages="${packages}{\"name\":\"${name}\",\"version\":\"${current_ver}\",\"newVersion\":\"${new_ver}\",\"isSecurityUpdate\":${is_security}}"
  done <<< "$raw_list"

  packages="${packages}]"
  echo "$packages"
}

install_packages() {
  local payload="$1"
  local packages_json source_info output status

  packages_json=$(echo "$payload" | python3 -c "import sys,json; d=json.load(sys.stdin); print(' '.join(d.get('packages',[])))" 2>/dev/null)
  source_info=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('source','manual'))" 2>/dev/null)

  if [[ -z "$packages_json" ]]; then
    echo "{\"status\":\"FAILED\",\"output\":\"No packages specified\"}"
    return
  fi

  log "Installing packages: $packages_json (source: $source_info)"

  local pm
  pm=$(detect_package_manager)

  case "$pm" in
    apt)
      output=$(DEBIAN_FRONTEND=noninteractive apt-get install -y $packages_json 2>&1) && status="COMPLETED" || status="FAILED"
      ;;
    dnf)
      output=$(dnf install -y $packages_json 2>&1) && status="COMPLETED" || status="FAILED"
      ;;
    yum)
      output=$(yum install -y $packages_json 2>&1) && status="COMPLETED" || status="FAILED"
      ;;
    *)
      output="Unknown package manager"
      status="FAILED"
      ;;
  esac

  # Escape output for JSON
  output=$(echo "$output" | tail -20 | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"status\":\"${status}\",\"output\":\"${output}\"}"
}

system_upgrade() {
  local payload="$1"
  local upgrade_type dry_run output status

  upgrade_type=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('type','all'))" 2>/dev/null)
  dry_run=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('dryRun', False))" 2>/dev/null)

  log "System upgrade requested: type=$upgrade_type dryRun=$dry_run"

  local pm
  pm=$(detect_package_manager)

  case "$pm" in
    apt)
      DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>/dev/null || true

      if [[ "$upgrade_type" == "security" ]]; then
        if [[ "$dry_run" == "True" ]]; then
          output=$(unattended-upgrade --dry-run -v 2>&1 || apt-get upgrade -s 2>&1 | grep -i security)
          status="COMPLETED"
        else
          output=$(unattended-upgrade -v 2>&1 || { DEBIAN_FRONTEND=noninteractive apt-get upgrade -y 2>&1; })
          status="COMPLETED"
        fi
      else
        if [[ "$dry_run" == "True" ]]; then
          output=$(DEBIAN_FRONTEND=noninteractive apt-get upgrade -s 2>&1)
          status="COMPLETED"
        else
          output=$(DEBIAN_FRONTEND=noninteractive apt-get upgrade -y 2>&1) && status="COMPLETED" || status="FAILED"
        fi
      fi
      ;;
    dnf|yum)
      local pkg_cmd="$pm"
      if [[ "$upgrade_type" == "security" ]]; then
        if [[ "$dry_run" == "True" ]]; then
          output=$($pkg_cmd update --security --assumeno 2>&1 || true)
          status="COMPLETED"
        else
          output=$($pkg_cmd update --security -y 2>&1) && status="COMPLETED" || status="FAILED"
        fi
      else
        if [[ "$dry_run" == "True" ]]; then
          output=$($pkg_cmd update --assumeno 2>&1 || true)
          status="COMPLETED"
        else
          output=$($pkg_cmd update -y 2>&1) && status="COMPLETED" || status="FAILED"
        fi
      fi
      ;;
    *)
      output="Unknown package manager"
      status="FAILED"
      ;;
  esac

  output=$(echo "$output" | tail -30 | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"status\":\"${status}\",\"output\":\"${output}\"}"
}

# ============================================================
# CONFIG MANAGEMENT
# ============================================================

get_config_file() {
  local payload="$1"
  local file_path content_b64 sha256_hash

  file_path=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('filePath',''))" 2>/dev/null)

  if [[ -z "$file_path" ]]; then
    echo "{\"status\":\"FAILED\",\"error\":\"No filePath provided\"}"
    return
  fi

  if [[ ! -f "$file_path" ]]; then
    echo "{\"status\":\"FAILED\",\"error\":\"File not found: ${file_path}\"}"
    return
  fi

  log "Reading config file: $file_path"

  content_b64=$(base64 -w0 "$file_path" 2>/dev/null)
  sha256_hash=$(sha256sum "$file_path" 2>/dev/null | awk '{print $1}')

  echo "{\"status\":\"OK\",\"content\":\"${content_b64}\",\"sha256\":\"${sha256_hash}\"}"
}

push_config_file() {
  local payload="$1"
  local file_path content_b64 backup_first restart_service

  file_path=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('filePath',''))" 2>/dev/null)
  content_b64=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('content',''))" 2>/dev/null)
  backup_first=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('backupFirst', True))" 2>/dev/null)
  restart_service=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('restartService',''))" 2>/dev/null)

  if [[ -z "$file_path" || -z "$content_b64" ]]; then
    echo "{\"status\":\"FAILED\",\"error\":\"filePath and content are required\"}"
    return
  fi

  log "Pushing config file: $file_path (backup=$backup_first, restart=$restart_service)"

  # Backup existing file
  local backup_path=""
  if [[ "$backup_first" == "True" && -f "$file_path" ]]; then
    backup_path="${file_path}.bak.$(date +%Y%m%d%H%M%S)"
    cp -p "$file_path" "$backup_path" 2>/dev/null || true
    log "Backed up to: $backup_path"
  fi

  # Decode and write new content
  echo "$content_b64" | base64 -d > "$file_path" 2>/dev/null
  if [[ $? -ne 0 ]]; then
    # Restore backup on decode failure
    if [[ -n "$backup_path" && -f "$backup_path" ]]; then
      cp -p "$backup_path" "$file_path"
    fi
    echo "{\"status\":\"FAILED\",\"error\":\"Failed to decode base64 content\"}"
    return
  fi

  local sha256_hash
  sha256_hash=$(sha256sum "$file_path" 2>/dev/null | awk '{print $1}')

  # Restart service if requested
  local restart_output=""
  if [[ -n "$restart_service" ]]; then
    restart_output=$(systemctl restart "$restart_service" 2>&1) || true
    log "Restarted service: $restart_service"
  fi

  restart_output=$(echo "$restart_output" | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"status\":\"OK\",\"backupPath\":\"${backup_path}\",\"sha256\":\"${sha256_hash}\",\"restartOutput\":\"${restart_output}\"}"
}

rollback_config_file() {
  local payload="$1"
  local file_path backup_path restart_service

  file_path=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('filePath',''))" 2>/dev/null)
  backup_path=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('backupPath',''))" 2>/dev/null)
  restart_service=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('restartService',''))" 2>/dev/null)

  if [[ -z "$file_path" || -z "$backup_path" ]]; then
    echo "{\"status\":\"FAILED\",\"error\":\"filePath and backupPath are required\"}"
    return
  fi

  if [[ ! -f "$backup_path" ]]; then
    echo "{\"status\":\"FAILED\",\"error\":\"Backup file not found: ${backup_path}\"}"
    return
  fi

  log "Rolling back config: $file_path from $backup_path"

  cp -p "$backup_path" "$file_path" 2>/dev/null
  if [[ $? -ne 0 ]]; then
    echo "{\"status\":\"FAILED\",\"error\":\"Failed to copy backup to target\"}"
    return
  fi

  local sha256_hash
  sha256_hash=$(sha256sum "$file_path" 2>/dev/null | awk '{print $1}')

  # Restart service if requested
  local restart_output=""
  if [[ -n "$restart_service" ]]; then
    restart_output=$(systemctl restart "$restart_service" 2>&1) || true
    log "Restarted service: $restart_service"
  fi

  restart_output=$(echo "$restart_output" | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"status\":\"OK\",\"sha256\":\"${sha256_hash}\",\"restartOutput\":\"${restart_output}\"}"
}

# ============================================================
# SERVICE MONITORING
# ============================================================

collect_services() {
  log "Collecting service statuses"

  local services_to_check=(sshd nginx apache2 mysql postgresql redis-server docker cron ufw fail2ban)
  local services_json="["
  local first=true

  for svc in "${services_to_check[@]}"; do
    # Check if the service unit exists
    if ! systemctl list-unit-files "${svc}.service" &>/dev/null && \
       ! systemctl list-units --all "${svc}.service" &>/dev/null 2>&1; then
      continue
    fi

    # Check if systemd knows about this service at all
    local unit_state
    unit_state=$(systemctl list-unit-files "${svc}.service" 2>/dev/null | grep "${svc}.service" | awk '{print $2}' || true)
    # If the unit isn't found at all, skip it
    if [[ -z "$unit_state" ]]; then
      # Also check if it's a running/loaded unit even if not in unit-files
      local load_state
      load_state=$(systemctl show "${svc}.service" --property=LoadState 2>/dev/null | cut -d= -f2 || true)
      if [[ "$load_state" == "not-found" || -z "$load_state" ]]; then
        continue
      fi
    fi

    local is_active is_enabled sub_state mem_bytes
    is_active=$(systemctl is-active "${svc}.service" 2>/dev/null || echo "inactive")
    is_enabled=$(systemctl is-enabled "${svc}.service" 2>/dev/null || echo "disabled")
    sub_state=$(systemctl show "${svc}.service" --property=SubState 2>/dev/null | cut -d= -f2 || echo "unknown")
    mem_bytes=$(systemctl show "${svc}.service" --property=MemoryCurrent 2>/dev/null | cut -d= -f2 || echo "0")

    # Convert "[not set]" or empty to 0
    if [[ "$mem_bytes" == "[not set]" || -z "$mem_bytes" ]]; then
      mem_bytes="0"
    fi

    local active_bool="false"
    local enabled_bool="false"
    [[ "$is_active" == "active" ]] && active_bool="true"
    [[ "$is_enabled" == "enabled" ]] && enabled_bool="true"

    if [[ "$first" == "true" ]]; then
      first=false
    else
      services_json="${services_json},"
    fi
    services_json="${services_json}{\"name\":\"${svc}\",\"active\":${active_bool},\"enabled\":${enabled_bool},\"subState\":\"${sub_state}\",\"memory\":${mem_bytes}}"
  done

  services_json="${services_json}]"
  echo "$services_json"
}

# ============================================================
# URL HEALTH CHECKS
# ============================================================

check_urls() {
  local payload="$1"
  local urls_json results_json

  urls_json=$(echo "$payload" | python3 -c "
import sys, json
d = json.load(sys.stdin)
urls = d.get('urls', [])
for u in urls:
    print(u)
" 2>/dev/null)

  if [[ -z "$urls_json" ]]; then
    echo "[]"
    return
  fi

  log "Checking URLs health"

  local results="["
  local first=true

  while IFS= read -r url; do
    [[ -z "$url" ]] && continue

    local status_code response_ms error_msg is_up

    # Use curl with timing
    local curl_output
    curl_output=$(curl -sS -o /dev/null -w "%{http_code} %{time_total}" \
      --max-time 15 --connect-timeout 10 \
      -L "$url" 2>&1) || true

    if echo "$curl_output" | grep -qE "^[0-9]{3} "; then
      status_code=$(echo "$curl_output" | awk '{print $1}')
      response_ms=$(echo "$curl_output" | awk '{printf "%.0f", $2 * 1000}')
      error_msg=""
    else
      status_code="0"
      response_ms="0"
      error_msg=$(echo "$curl_output" | sed 's/"/\\"/g' | tr '\n' ' ' | head -c 200)
    fi

    if [[ "$status_code" -ge 200 && "$status_code" -lt 400 ]]; then
      is_up="true"
    else
      is_up="false"
    fi

    if [[ "$first" == "true" ]]; then
      first=false
    else
      results="${results},"
    fi

    # Escape URL for JSON
    local escaped_url
    escaped_url=$(echo "$url" | sed 's/"/\\"/g')
    results="${results}{\"url\":\"${escaped_url}\",\"statusCode\":${status_code},\"responseMs\":${response_ms},\"error\":\"${error_msg}\",\"isUp\":${is_up}}"
  done <<< "$urls_json"

  results="${results}]"
  echo "$results"
}

# ============================================================
# LOG COLLECTION
# ============================================================

collect_logs() {
  local payload="$1"
  local source lines filter log_output

  source=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('source','syslog'))" 2>/dev/null)
  lines=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('lines', 100))" 2>/dev/null)
  filter=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('filter',''))" 2>/dev/null)

  log "Collecting logs: source=$source lines=$lines filter=$filter"

  case "$source" in
    nginx)
      if [[ -f /var/log/nginx/error.log ]]; then
        log_output=$(tail -n "$lines" /var/log/nginx/error.log 2>/dev/null || true)
      elif [[ -f /var/log/nginx/access.log ]]; then
        log_output=$(tail -n "$lines" /var/log/nginx/access.log 2>/dev/null || true)
      else
        log_output="Nginx log files not found"
      fi
      ;;
    syslog)
      if [[ -f /var/log/syslog ]]; then
        log_output=$(tail -n "$lines" /var/log/syslog 2>/dev/null || true)
      elif [[ -f /var/log/messages ]]; then
        log_output=$(tail -n "$lines" /var/log/messages 2>/dev/null || true)
      else
        log_output="Syslog files not found"
      fi
      ;;
    journal)
      log_output=$(journalctl --no-pager -n "$lines" 2>/dev/null || echo "journalctl not available")
      ;;
    *)
      # Treat source as a file path
      if [[ -f "$source" ]]; then
        log_output=$(tail -n "$lines" "$source" 2>/dev/null || echo "Cannot read file: $source")
      else
        log_output="Log source not found: $source"
      fi
      ;;
  esac

  # Apply filter if provided
  if [[ -n "$filter" ]]; then
    log_output=$(echo "$log_output" | grep -iE "$filter" || echo "(no lines matched filter)")
  fi

  # Base64 encode the output
  local encoded
  encoded=$(echo "$log_output" | base64 -w0 2>/dev/null)

  echo "{\"status\":\"OK\",\"source\":\"${source}\",\"lines\":${lines},\"content\":\"${encoded}\"}"
}

# ============================================================
# SYSTEM VERSION DETECTION
# ============================================================

collect_system_versions() {
  log "Collecting system versions"

  local os_version kernel_version nginx_ver node_ver python_ver php_ver
  local mysql_ver postgres_ver redis_ver docker_ver openssl_ver

  # OS
  os_version=$(. /etc/os-release 2>/dev/null && echo "${PRETTY_NAME:-unknown}" || echo "unknown")

  # Kernel
  kernel_version=$(uname -r 2>/dev/null || echo "unknown")

  # Nginx
  nginx_ver=$(nginx -v 2>&1 | grep -oP 'nginx/\K[\d.]+' || echo "")

  # Node.js
  node_ver=$(node --version 2>/dev/null | tr -d 'v' || echo "")

  # Python3
  python_ver=$(python3 --version 2>/dev/null | awk '{print $2}' || echo "")

  # PHP
  php_ver=$(php --version 2>/dev/null | head -1 | awk '{print $2}' || echo "")

  # MySQL / MariaDB
  mysql_ver=$(mysql --version 2>/dev/null | grep -oP '[\d]+\.[\d]+\.[\d]+' | head -1 || echo "")

  # PostgreSQL
  postgres_ver=$(psql --version 2>/dev/null | grep -oP '[\d]+\.[\d]+' | head -1 || echo "")

  # Redis
  redis_ver=$(redis-server --version 2>/dev/null | grep -oP 'v=\K[\d.]+' || echo "")

  # Docker
  docker_ver=$(docker --version 2>/dev/null | grep -oP '[\d]+\.[\d]+\.[\d]+' | head -1 || echo "")

  # OpenSSL
  openssl_ver=$(openssl version 2>/dev/null | awk '{print $2}' || echo "")

  # Escape for JSON (os_version may contain special chars)
  os_version=$(echo "$os_version" | sed 's/"/\\"/g')

  echo "{\"os\":\"${os_version}\",\"kernel\":\"${kernel_version}\",\"nginx\":\"${nginx_ver}\",\"node\":\"${node_ver}\",\"python3\":\"${python_ver}\",\"php\":\"${php_ver}\",\"mysql\":\"${mysql_ver}\",\"postgresql\":\"${postgres_ver}\",\"redis\":\"${redis_ver}\",\"docker\":\"${docker_ver}\",\"openssl\":\"${openssl_ver}\"}"
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
      COLLECT_PACKAGES)
        local pm
        pm=$(detect_package_manager)
        case "$pm" in
          apt)   output=$(collect_packages_apt) ;;
          dnf|yum) output=$(collect_packages_yum) ;;
          *)     output="[]"; log "Unknown package manager: $pm" ;;
        esac
        status="COMPLETED"
        ;;
      INSTALL_PACKAGES)
        local result
        result=$(install_packages "$payload")
        output="$result"
        status=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','FAILED'))" 2>/dev/null || echo "COMPLETED")
        ;;
      SYSTEM_UPGRADE)
        local result
        result=$(system_upgrade "$payload")
        output="$result"
        status=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','FAILED'))" 2>/dev/null || echo "COMPLETED")
        ;;
      ROLLBACK_PACKAGE)
        local package version
        package=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('package',''))" 2>/dev/null)
        version=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version',''))" 2>/dev/null)
        if [[ -n "$package" && -n "$version" ]]; then
          local pm
          pm=$(detect_package_manager)
          case "$pm" in
            apt)
              output=$(DEBIAN_FRONTEND=noninteractive apt-get install -y --allow-downgrades "${package}=${version}" 2>&1) && status="COMPLETED" || status="FAILED"
              ;;
            dnf|yum)
              output=$(${pm} downgrade -y "${package}-${version}" 2>&1) && status="COMPLETED" || status="FAILED"
              ;;
            *)
              output="Unknown package manager"
              status="FAILED"
              ;;
          esac
        else
          output="Package name and version are required"
          status="FAILED"
        fi
        ;;
      GET_CONFIG)
        output=$(get_config_file "$payload")
        status="COMPLETED"
        ;;
      PUSH_CONFIG)
        local result
        result=$(push_config_file "$payload")
        output="$result"
        status=$(echo "$result" | python3 -c "import sys,json; print('COMPLETED' if json.load(sys.stdin).get('status')=='OK' else 'FAILED')" 2>/dev/null || echo "COMPLETED")
        ;;
      ROLLBACK_CONFIG)
        local result
        result=$(rollback_config_file "$payload")
        output="$result"
        status=$(echo "$result" | python3 -c "import sys,json; print('COMPLETED' if json.load(sys.stdin).get('status')=='OK' else 'FAILED')" 2>/dev/null || echo "COMPLETED")
        ;;
      COLLECT_SERVICES)
        output=$(collect_services)
        status="COMPLETED"
        ;;
      CHECK_URLS)
        output=$(check_urls "$payload")
        status="COMPLETED"
        ;;
      COLLECT_LOGS)
        output=$(collect_logs "$payload")
        status="COMPLETED"
        ;;
      COLLECT_SYSTEM_VERSIONS)
        output=$(collect_system_versions)
        status="COMPLETED"
        ;;
      CLEAR_CACHE)
        local cache_type
        cache_type=$(echo "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin).get('type','all'))" 2>/dev/null)
        case "$cache_type" in
          apt)
            output=$(DEBIAN_FRONTEND=noninteractive apt-get clean 2>&1) && status="COMPLETED" || status="FAILED"
            ;;
          nginx)
            output=$(nginx -s reload 2>&1) && status="COMPLETED" || status="FAILED"
            ;;
          systemd)
            output=$(systemctl daemon-reload 2>&1) && status="COMPLETED" || status="FAILED"
            ;;
          all)
            local out1 out2 out3
            out1=$(DEBIAN_FRONTEND=noninteractive apt-get clean 2>&1 || true)
            out2=$(nginx -s reload 2>&1 || true)
            out3=$(systemctl daemon-reload 2>&1 || true)
            output="apt-clean: ${out1}; nginx-reload: ${out2}; daemon-reload: ${out3}"
            status="COMPLETED"
            ;;
          *)
            output="Unknown cache type: $cache_type"
            status="FAILED"
            ;;
        esac
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

  # Service status check (every SERVICE_CHECK_INTERVAL seconds — 30 min)
  local service_statuses_payload=""
  if (( now - LAST_SERVICE_CHECK >= SERVICE_CHECK_INTERVAL )); then
    CACHED_SERVICE_STATUSES=$(collect_services)
    LAST_SERVICE_CHECK=$now
    log "Periodic service status check completed"
  fi
  service_statuses_payload="$CACHED_SERVICE_STATUSES"

  # Build payload
  local payload
  payload="{\"metrics\":${metrics},\"systemInfo\":${system_info},\"alerts\":${all_alerts},\"devices\":${devices},\"commandResults\":${cmd_results},\"serviceStatuses\":${service_statuses_payload}}"

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
        -d "{\"metrics\":${metrics},\"systemInfo\":${system_info},\"alerts\":[],\"devices\":[],\"commandResults\":${cmd_results},\"serviceStatuses\":[]}" \
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
  log "Service check interval: ${SERVICE_CHECK_INTERVAL}s"

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
