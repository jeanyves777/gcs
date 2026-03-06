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
  if ls /var/lib/apt/lists/*security*Packages &>/dev/null || apt-get upgrade -s 2>/dev/null | grep -qi "security"; then
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
# FULL SECURITY SCAN
# ============================================================

run_security_scan() {
  log "Starting full security scan..."

  # Collect all data into temp files for python3 to assemble
  local tmpdir
  tmpdir=$(mktemp -d /tmp/gcsguard-scan.XXXXXX)

  # --- System Metrics ---
  local cpu_pct mem_total mem_used mem_pct disk_total disk_used disk_pct
  local load1 load5 load15 uptime_secs proc_count net_rx net_tx

  cpu_pct=$(top -bn1 2>/dev/null | grep "Cpu(s)" | awk '{print $2 + $4}' || echo "0")

  # Memory from /proc/meminfo (matches internal scanner exactly)
  if [[ -f /proc/meminfo ]]; then
    mem_total=$(awk '/^MemTotal:/ {print $2 * 1024}' /proc/meminfo)
    local mem_free buffers cached sreclaimable
    mem_free=$(awk '/^MemFree:/ {print $2 * 1024}' /proc/meminfo)
    buffers=$(awk '/^Buffers:/ {print $2 * 1024}' /proc/meminfo)
    cached=$(awk '/^Cached:/ {print $2 * 1024}' /proc/meminfo || echo "0")
    sreclaimable=$(awk '/^SReclaimable:/ {print $2 * 1024}' /proc/meminfo 2>/dev/null || echo "0")
    mem_used=$((mem_total - mem_free - buffers - cached - sreclaimable))
    if (( mem_total > 0 )); then
      mem_pct=$((mem_used * 100 / mem_total))
    else
      mem_pct=0
    fi
  else
    mem_total=0; mem_used=0; mem_pct=0
  fi

  # Disk
  local df_line
  df_line=$(df -B1 / 2>/dev/null | tail -1)
  disk_total=$(echo "$df_line" | awk '{print $2}')
  disk_used=$(echo "$df_line" | awk '{print $3}')
  disk_pct=$(echo "$df_line" | awk '{gsub(/%/,"",$5); print $5}')

  # Load average
  read -r load1 load5 load15 _ _ < /proc/loadavg 2>/dev/null || { load1=0; load5=0; load15=0; }

  # Uptime
  uptime_secs=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo "0")

  # Process count
  proc_count=$(ps aux 2>/dev/null | wc -l)
  proc_count=$((proc_count - 1))

  # Network I/O
  local iface
  iface=$(ip route 2>/dev/null | grep default | awk '{print $5}' | head -1 || echo "eth0")
  if [[ -f /proc/net/dev ]]; then
    net_rx=$(grep "$iface" /proc/net/dev 2>/dev/null | awk '{print $2}' || echo "0")
    net_tx=$(grep "$iface" /proc/net/dev 2>/dev/null | awk '{print $10}' || echo "0")
  else
    net_rx=0; net_tx=0
  fi

  # --- Open Ports (ss) ---
  local ports_data
  ports_data=$(ss -tlnup 2>/dev/null || netstat -tlnup 2>/dev/null || echo "")
  echo "$ports_data" > "$tmpdir/ports_raw.txt"

  # --- Services ---
  local services_list="nginx postgresql ssh ufw fail2ban pm2-root cups snapd apache2 mysql redis-server docker"
  local svc_data=""
  for svc in $services_list; do
    local svc_status svc_enabled svc_pid
    svc_status=$(systemctl is-active "$svc" 2>/dev/null || echo "unknown")
    svc_enabled=$(systemctl is-enabled "$svc" 2>/dev/null || echo "unknown")
    svc_pid=$(systemctl show "$svc" --property=MainPID 2>/dev/null | cut -d= -f2 || echo "0")
    svc_data="${svc_data}${svc}|${svc_status}|${svc_enabled}|${svc_pid}\n"
  done
  echo -e "$svc_data" > "$tmpdir/services.txt"

  # --- Patches ---
  DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>/dev/null || true
  local patch_all patch_sec patch_pkgs
  patch_all=$(apt list --upgradable 2>/dev/null | grep -v "^Listing" | head -50 || true)
  patch_sec=$(echo "$patch_all" | grep -i security || true)
  patch_pkgs=$(echo "$patch_all" | awk -F'/' '{print $1}' | head -20 || true)
  echo "$patch_all" > "$tmpdir/patches_all.txt"
  echo "$patch_sec" > "$tmpdir/patches_sec.txt"
  echo "$patch_pkgs" > "$tmpdir/patches_pkgs.txt"

  # --- Auth Log ---
  grep -i 'sshd' /var/log/auth.log 2>/dev/null | tail -100 > "$tmpdir/auth_log.txt" || true
  fail2ban-client status sshd 2>/dev/null > "$tmpdir/fail2ban.txt" || true

  # --- SSH Config ---
  cat /etc/ssh/sshd_config 2>/dev/null > "$tmpdir/sshd_config.txt" || true

  # --- File Integrity ---
  local critical_paths="/etc/passwd /etc/shadow /etc/sudoers /etc/ssh/sshd_config /etc/nginx/nginx.conf"
  local fi_data=""
  for fp in $critical_paths; do
    if [[ -f "$fp" ]]; then
      local fi_stat
      fi_stat=$(stat -c "%a %U %G" "$fp" 2>/dev/null || echo "??? ??? ???")
      fi_data="${fi_data}${fp}|${fi_stat}\n"
    else
      fi_data="${fi_data}${fp}|MISSING\n"
    fi
  done
  # Also check for .env files in common web dirs
  for envf in /var/www/*/.env /var/www/*/.env.production /home/*/.env; do
    if [[ -f "$envf" ]]; then
      local fi_stat
      fi_stat=$(stat -c "%a %U %G" "$envf" 2>/dev/null || echo "??? ??? ???")
      fi_data="${fi_data}${envf}|${fi_stat}\n"
    fi
  done
  echo -e "$fi_data" > "$tmpdir/file_integrity.txt"

  # --- Firewall ---
  local fw_rules
  fw_rules=$(iptables -L INPUT -n 2>/dev/null | wc -l || echo "0")
  local ufw_status
  ufw_status=$(ufw status 2>/dev/null | head -1 || echo "inactive")
  echo "${fw_rules}|${ufw_status}" > "$tmpdir/firewall.txt"

  # --- SSL Certificate ---
  local ssl_data=""
  # Try the server's own hostname and common domains
  local server_hostname
  server_hostname=$(hostname -f 2>/dev/null || hostname)
  for domain in "$server_hostname" "$(hostname -d 2>/dev/null || true)"; do
    if [[ -n "$domain" && "$domain" != "localhost" ]]; then
      local ssl_expiry
      ssl_expiry=$(echo | timeout 5 openssl s_client -connect "${domain}:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null || true)
      if [[ -n "$ssl_expiry" ]]; then
        ssl_data="${domain}|${ssl_expiry}"
        break
      fi
    fi
  done
  echo "$ssl_data" > "$tmpdir/ssl.txt"

  # --- Active Connections ---
  ss -tnp 2>/dev/null | grep ESTAB > "$tmpdir/connections.txt" || true

  # --- SSH Sessions ---
  who 2>/dev/null > "$tmpdir/who.txt" || true

  # --- ARP/Neighbors ---
  ip neigh show 2>/dev/null > "$tmpdir/neighbors.txt" || arp -n 2>/dev/null > "$tmpdir/neighbors.txt" || true

  # --- Server Type Detection ---
  local has_nginx has_apache has_psql has_mysql has_mongod has_postfix has_redis has_docker
  has_nginx=$(which nginx 2>/dev/null && echo "1" || echo "0")
  has_apache=$(which apache2 2>/dev/null || which httpd 2>/dev/null && echo "1" || echo "0")
  has_psql=$(which psql 2>/dev/null && echo "1" || echo "0")
  has_mysql=$(which mysql 2>/dev/null && echo "1" || echo "0")
  has_mongod=$(which mongod 2>/dev/null && echo "1" || echo "0")
  has_postfix=$(which postfix 2>/dev/null && echo "1" || echo "0")
  has_redis=$(which redis-server 2>/dev/null && echo "1" || echo "0")
  has_docker=$(which docker 2>/dev/null && echo "1" || echo "0")
  echo "${has_nginx}|${has_apache}|${has_psql}|${has_mysql}|${has_mongod}|${has_postfix}|${has_redis}|${has_docker}" > "$tmpdir/server_detection.txt"

  # --- Admin SSH Key Fingerprint ---
  local admin_fp
  admin_fp=$(ssh-keygen -lf /root/.ssh/authorized_keys 2>/dev/null | head -5 || ssh-keygen -lf /home/*/.ssh/authorized_keys 2>/dev/null | head -5 || echo "unknown")
  echo "$admin_fp" > "$tmpdir/admin_keys.txt"

  # --- Use Python3 to build the complete JSON scan result ---
  local scan_json
  scan_json=$(python3 << 'PYEOF'
import json, sys, os, re
from datetime import datetime

tmpdir = sys.argv[1] if len(sys.argv) > 1 else "/tmp/gcsguard-scan"

def read_file(name):
    try:
        with open(os.path.join(tmpdir, name)) as f:
            return f.read().strip()
    except:
        return ""

# === Metrics ===
metrics = {
    "cpuPercent": float(os.environ.get("SCAN_CPU", "0")),
    "memTotal": int(os.environ.get("SCAN_MEM_TOTAL", "0")),
    "memUsed": int(os.environ.get("SCAN_MEM_USED", "0")),
    "memPercent": int(os.environ.get("SCAN_MEM_PCT", "0")),
    "diskTotal": int(os.environ.get("SCAN_DISK_TOTAL", "0")),
    "diskUsed": int(os.environ.get("SCAN_DISK_USED", "0")),
    "diskPercent": int(os.environ.get("SCAN_DISK_PCT", "0")),
    "loadAvg": [float(os.environ.get("SCAN_LOAD1", "0")), float(os.environ.get("SCAN_LOAD5", "0")), float(os.environ.get("SCAN_LOAD15", "0"))],
    "uptime": int(os.environ.get("SCAN_UPTIME", "0")),
    "processes": int(os.environ.get("SCAN_PROCS", "0")),
    "networkRx": int(os.environ.get("SCAN_NET_RX", "0")),
    "networkTx": int(os.environ.get("SCAN_NET_TX", "0")),
}

# === Ports ===
PORT_ROLES = {
    80: "web", 443: "web", 8443: "web",
    3000: "app", 3001: "app", 4000: "app", 5000: "app", 8000: "app", 9000: "app", 8080: "app",
    5432: "database", 3306: "database", 27017: "database", 6379: "database", 1433: "database",
    25: "mail", 465: "mail", 587: "mail", 993: "mail", 143: "mail", 110: "mail", 995: "mail",
    53: "dns", 3128: "proxy", 9090: "monitoring", 9100: "monitoring",
    21: "storage", 2049: "storage", 8081: "ci_cd", 8082: "ci_cd",
}
SERVICE_MAP = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
    80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 445: "SMB",
    631: "CUPS", 993: "IMAPS", 995: "POP3S", 1433: "MSSQL", 3000: "Node",
    3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL", 5900: "VNC",
    6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt", 9200: "Elasticsearch",
    9876: "GCS-Daemon", 27017: "MongoDB",
}
RISK_MAP = {
    21: "critical", 23: "critical", 445: "critical", 3389: "critical",
    5900: "high", 1433: "high", 3306: "high", 27017: "high", 9200: "high",
    25: "medium", 110: "medium", 143: "medium", 6379: "medium", 8080: "medium", 631: "medium",
    22: "info", 80: "info", 443: "info", 5432: "info", 3000: "low", 9876: "info", 53: "info",
}

ports = []
seen = set()
for line in read_file("ports_raw.txt").split("\n"):
    if not line or ("LISTEN" not in line and "0.0.0.0" not in line and ":::" not in line):
        continue
    # Parse address:port
    parts = line.split()
    for part in parts:
        m = re.search(r'(\S+):(\d+)$', part)
        if m:
            addr = m.group(1)
            port = int(m.group(2))
            if port > 65535 or port == 0:
                continue
            key = f"{addr}:{port}"
            if key in seen:
                continue
            seen.add(key)
            # Extract process name
            proc_match = re.search(r'users:\(\("([^"]+)"', line)
            proc_name = proc_match.group(1) if proc_match else ""
            ports.append({
                "port": port,
                "protocol": "TCP",
                "state": "LISTEN",
                "service": SERVICE_MAP.get(port, proc_name or "unknown"),
                "address": addr,
                "risk": RISK_MAP.get(port, "info"),
            })
            break

ports.sort(key=lambda p: {"critical":0,"high":1,"medium":2,"low":3,"info":4}.get(p["risk"], 4))

# === Server Type Detection ===
ROLE_PORTS = {
    "web": [22, 53, 80, 443], "app": [22, 53, 3000, 3001, 4000, 5000, 8000, 9000],
    "database": [22, 53, 5432, 3306, 27017, 6379, 1433],
    "mail": [22, 53, 25, 465, 587, 993, 143, 110, 995],
    "dns": [22, 53], "proxy": [22, 53, 80, 443, 8080, 3128],
    "monitoring": [22, 53, 9090, 9100, 3100], "storage": [22, 53, 21, 2049],
    "ci_cd": [22, 53, 8081, 8082],
}
UNEXPECTED_SERVICES = {
    "web": ["cups", "avahi-daemon", "bluetooth", "ModemManager"],
    "app": ["cups", "avahi-daemon", "bluetooth", "ModemManager"],
    "database": ["cups", "avahi-daemon", "bluetooth", "apache2", "httpd"],
    "mail": ["cups", "avahi-daemon", "bluetooth"],
    "dns": ["cups", "avahi-daemon", "bluetooth", "apache2"],
    "proxy": ["cups", "avahi-daemon", "bluetooth"],
    "monitoring": ["cups", "avahi-daemon", "bluetooth"],
    "storage": ["cups", "avahi-daemon", "bluetooth"],
    "ci_cd": ["cups", "avahi-daemon", "bluetooth"],
}
ROLE_LABELS = {
    "web": "Web Server", "app": "Application Server", "database": "Database Server",
    "mail": "Mail Server", "dns": "DNS Server", "proxy": "Reverse Proxy",
    "monitoring": "Monitoring Server", "storage": "File/Storage Server", "ci_cd": "CI/CD Server",
}

listening_ports = [p["port"] for p in ports]
detected_roles = set()
for port in listening_ports:
    role = PORT_ROLES.get(port)
    if role:
        detected_roles.add(role)

# Detect from installed binaries
det = read_file("server_detection.txt").split("|")
if len(det) >= 8:
    if "1" in det[0] or "1" in det[1]: detected_roles.add("web")
    if "1" in det[2] or "1" in det[3] or "1" in det[4]: detected_roles.add("database")
    if "1" in det[5]: detected_roles.add("mail")

if not detected_roles:
    detected_roles.add("app")

roles = list(detected_roles)
priority = ["web", "app", "database", "mail", "proxy", "dns", "monitoring", "storage", "ci_cd"]
primary = next((r for r in priority if r in detected_roles), roles[0])

expected_ports = {22, 53}
for role in roles:
    for p in ROLE_PORTS.get(role, []):
        expected_ports.add(p)
if 9876 in listening_ports:
    expected_ports.add(9876)

unexpected_svcs = set(UNEXPECTED_SERVICES.get(roles[0], []))
for role in roles[1:]:
    unexpected_svcs &= set(UNEXPECTED_SERVICES.get(role, []))

server_type = {
    "roles": roles,
    "primary": primary,
    "label": " + ".join(ROLE_LABELS.get(r, r) for r in roles),
    "expectedPorts": sorted(expected_ports),
    "unexpectedServices": list(unexpected_svcs),
}

# === Services ===
services = []
for line in read_file("services.txt").split("\n"):
    if not line or "|" not in line:
        continue
    parts = line.split("|")
    if len(parts) < 4:
        continue
    name, status, enabled, pid = parts[0], parts[1], parts[2], parts[3]
    status_val = status if status in ("active", "inactive", "failed") else "unknown"
    services.append({
        "name": name,
        "status": status_val,
        "enabled": enabled == "enabled",
        "pid": pid if pid != "0" else None,
    })

# === Patches ===
patch_all_lines = [l for l in read_file("patches_all.txt").split("\n") if l.strip()]
patch_sec_lines = [l for l in read_file("patches_sec.txt").split("\n") if l.strip()]
patch_pkg_lines = [l for l in read_file("patches_pkgs.txt").split("\n") if l.strip()]
patches = {
    "total": len(patch_all_lines),
    "security": len(patch_sec_lines),
    "packages": patch_pkg_lines[:20],
}

# === Auth Events ===
auth_events = []
for line in read_file("auth_log.txt").split("\n"):
    if not line:
        continue
    ts_match = re.match(r'^(\w+\s+\d+\s+\d+:\d+:\d+)', line)
    ts = ts_match.group(1) if ts_match else ""
    ip_match = re.search(r'from\s+(\d+\.\d+\.\d+\.\d+)', line)
    ip = ip_match.group(1) if ip_match else "unknown"
    user_match = re.search(r'(?:user|for)\s+(\S+)', line, re.I)
    user = user_match.group(1) if user_match else "unknown"

    if re.search(r'Invalid user|Failed password|authentication failure', line, re.I):
        auth_events.append({"timestamp": ts, "type": "failure", "user": user, "ip": ip, "message": line[:120]})
    elif re.search(r'Accepted publickey|Accepted password', line, re.I):
        auth_events.append({"timestamp": ts, "type": "success", "user": user, "ip": ip, "message": line[:120]})
    elif re.search(r'Ban |BANNED', line, re.I):
        auth_events.append({"timestamp": ts, "type": "ban", "user": user, "ip": ip, "message": line[:120]})

# Fail2ban bans
f2b_data = read_file("fail2ban.txt")
banned_match = re.search(r'Banned IP list:\s+(.+)', f2b_data)
if banned_match:
    for ip in banned_match.group(1).strip().split():
        if ip:
            auth_events.append({"timestamp": datetime.now().isoformat(), "type": "ban", "user": "sshd", "ip": ip, "message": f"Fail2Ban active ban: {ip}"})
auth_events = auth_events[-50:]

# === File Integrity ===
file_integrity = []
for line in read_file("file_integrity.txt").split("\n"):
    if not line or "|" not in line:
        continue
    parts = line.split("|")
    path = parts[0]
    stat_info = parts[1] if len(parts) > 1 else "MISSING"

    if stat_info == "MISSING":
        file_integrity.append({"path": path, "status": "warning", "permissions": "???", "owner": "???", "issue": "File not found"})
        continue

    stat_parts = stat_info.strip().split()
    perms = stat_parts[0] if stat_parts else "???"
    owner = stat_parts[1] if len(stat_parts) > 1 else "???"

    status = "ok"
    issue = None
    try:
        perm_num = int(perms)
    except:
        perm_num = 0

    if ".env" in path and perm_num > 600:
        status = "danger"
        issue = f"World-readable .env file ({perms}) -- should be 600"
    elif "shadow" in path and perm_num > 640:
        status = "danger"
        issue = f"Shadow file too permissive ({perms})"
    elif "sudoers" in path and perm_num > 440:
        status = "danger"
        issue = f"Sudoers too permissive ({perms})"
    elif "sshd_config" in path and perm_num > 644:
        status = "warning"
        issue = f"SSH config writable by non-root ({perms})"

    file_integrity.append({"path": path, "status": status, "permissions": perms, "owner": owner, "issue": issue})

# === Connection Audit ===
active_connections = []
for line in read_file("connections.txt").split("\n"):
    if not line:
        continue
    parts = line.split()
    if len(parts) < 5:
        continue
    local_m = re.search(r'(.+):(\d+)$', parts[3])
    remote_m = re.search(r'(.+):(\d+)$', parts[4])
    if not local_m or not remote_m:
        continue
    proc_match = re.search(r'users:\(\("([^"]+)",pid=(\d+)', line)
    active_connections.append({
        "protocol": "TCP",
        "localAddr": local_m.group(1),
        "localPort": int(local_m.group(2)),
        "remoteAddr": remote_m.group(1),
        "remotePort": int(remote_m.group(2)),
        "state": "ESTABLISHED",
        "process": proc_match.group(1) if proc_match else "unknown",
        "pid": proc_match.group(2) if proc_match else "",
    })

ssh_sessions = []
for line in read_file("who.txt").split("\n"):
    if not line:
        continue
    m = re.match(r'^(\S+)\s+(\S+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}|\w+\s+\w+\s+\d+\s+\d+:\d+)\s+\((.+?)\)', line)
    if m:
        ssh_sessions.append({"user": m.group(1), "ip": m.group(4), "loginTime": m.group(3), "tty": m.group(2)})

neighbors = []
for line in read_file("neighbors.txt").split("\n"):
    if not line:
        continue
    m = re.match(r'^(\S+)\s+dev\s+(\S+)\s+lladdr\s+(\S+)\s+(\S+)', line)
    if m:
        neighbors.append({"ip": m.group(1), "interface": m.group(2), "mac": m.group(3), "state": m.group(4)})

admin_fp = read_file("admin_keys.txt") or "unknown"
connection_audit = {
    "activeConnections": active_connections,
    "sshSessions": ssh_sessions,
    "neighbors": neighbors,
    "adminKeyFingerprint": admin_fp,
    "trustedSessionActive": False,
}

# === Security Findings (mirrors internal-scanner.ts runSecurityChecks) ===
findings = []
fid = [0]
def uid():
    fid[0] += 1
    return f"f{fid[0]}"

sshd_config = read_file("sshd_config.txt")
fw_data = read_file("firewall.txt").split("|")
fw_rules = int(fw_data[0]) if fw_data[0].isdigit() else 0
ufw_status_str = fw_data[1] if len(fw_data) > 1 else ""

# Firewall
if fw_rules <= 2 and "active" not in ufw_status_str.lower():
    findings.append({"id": uid(), "category": "firewall", "severity": "CRITICAL", "title": "No Firewall Rules Active", "description": "iptables has no INPUT rules and UFW is not active. Server ports are fully exposed.", "remediation": "Enable UFW or add iptables rules to restrict access."})
elif "active" in ufw_status_str.lower():
    findings.append({"id": uid(), "category": "firewall", "severity": "INFO", "title": "UFW Firewall Active", "description": "UFW firewall is enabled and active.", "remediation": "No action needed."})
else:
    findings.append({"id": uid(), "category": "firewall", "severity": "INFO", "title": f"Firewall Active ({fw_rules - 2} iptables rules)", "description": "iptables INPUT chain has active filtering rules.", "remediation": "No action needed."})

# Fail2Ban
f2b_active = any(s["name"] == "fail2ban" and s["status"] == "active" for s in services)
banned_count = len([e for e in auth_events if e["type"] == "ban"])
if not f2b_active:
    findings.append({"id": uid(), "category": "auth", "severity": "HIGH", "title": "Fail2Ban is not running", "description": "Brute-force protection is offline.", "remediation": "Run: systemctl start fail2ban && systemctl enable fail2ban"})
else:
    findings.append({"id": uid(), "category": "auth", "severity": "INFO", "title": f"Fail2Ban Active ({banned_count} IPs banned)", "description": "Brute-force protection is running.", "remediation": "No action needed."})

# SSH Config
if "PasswordAuthentication yes" in sshd_config:
    findings.append({"id": uid(), "category": "auth", "severity": "HIGH", "title": "SSH Password Auth Enabled", "description": "Password-based SSH login is enabled. Brute-force risk.", "remediation": "Set PasswordAuthentication no in /etc/ssh/sshd_config"})
else:
    findings.append({"id": uid(), "category": "auth", "severity": "INFO", "title": "SSH: Key-only Authentication", "description": "Password SSH login is disabled.", "remediation": "No action needed."})

# SSH Port
ssh_on_22 = bool(re.search(r'^Port\s+22', sshd_config, re.M)) or not re.search(r'^Port\s+', sshd_config, re.M)
if ssh_on_22:
    key_only = "PasswordAuthentication no" in sshd_config
    if f2b_active and key_only:
        findings.append({"id": uid(), "category": "network", "severity": "INFO", "title": "SSH on Port 22 (Protected)", "description": "Default SSH port with fail2ban active and key-only auth.", "remediation": "No action needed."})
    else:
        findings.append({"id": uid(), "category": "network", "severity": "LOW", "title": "SSH on Default Port 22", "description": "Using the default SSH port increases automated attack surface.", "remediation": "Enable fail2ban and disable password authentication."})

# Root Login
root_login_m = re.search(r'^PermitRootLogin\s+(.+)', sshd_config, re.M)
root_login = root_login_m.group(1).strip() if root_login_m else "prohibit-password"
if root_login == "yes":
    findings.append({"id": uid(), "category": "auth", "severity": "CRITICAL", "title": "Root SSH Login Allowed", "description": "Direct root login via SSH is permitted.", "remediation": "Set PermitRootLogin prohibit-password or no in sshd_config"})
else:
    findings.append({"id": uid(), "category": "auth", "severity": "INFO", "title": f"SSH Root Login: {root_login}", "description": "Root login is properly restricted.", "remediation": "No action needed."})

# Brute Force
recent_failures = len([e for e in auth_events if e["type"] == "failure"])
f2b_banned_count_m = re.search(r"Currently banned:\s+(\d+)", f2b_data)
f2b_banned = int(f2b_banned_count_m.group(1)) if f2b_banned_count_m else 0
if recent_failures > 20 and not f2b_active:
    findings.append({"id": uid(), "category": "auth", "severity": "HIGH", "title": f"{recent_failures} SSH Brute-Force Attempts (Unprotected!)", "description": f"{recent_failures} failed SSH login attempts and fail2ban is NOT running.", "remediation": "Install and enable fail2ban immediately.", "value": f"{recent_failures} attempts"})
elif recent_failures > 20:
    findings.append({"id": uid(), "category": "auth", "severity": "MEDIUM", "title": f"{recent_failures} SSH Login Attempts ({f2b_banned} IPs Banned)", "description": f"{recent_failures} failed attempts. Fail2ban is active with {f2b_banned} IPs banned.", "remediation": "Fail2ban is handling this. Review: fail2ban-client status sshd", "value": f"{recent_failures} attempts"})
elif recent_failures > 0 and f2b_active:
    findings.append({"id": uid(), "category": "auth", "severity": "INFO", "title": f"{recent_failures} Failed SSH Logins (Fail2ban Active)", "description": f"{recent_failures} failed attempts -- normal. Fail2ban active with {f2b_banned} IPs banned.", "remediation": "No action needed.", "value": f"{recent_failures} attempts"})
elif recent_failures > 0:
    findings.append({"id": uid(), "category": "auth", "severity": "MEDIUM", "title": f"{recent_failures} Failed SSH Logins", "description": "Failed SSH attempts detected without fail2ban protection.", "remediation": "Install fail2ban.", "value": f"{recent_failures} attempts"})

# Unexpected Ports
for dp in ports:
    if dp["port"] not in expected_ports:
        is_local = dp["address"] in ("127.0.0.1", "::1") or dp["address"].startswith("127.")
        if is_local:
            sev = "LOW"
        elif dp["risk"] == "critical":
            sev = "CRITICAL"
        elif dp["risk"] == "high":
            sev = "HIGH"
        else:
            sev = "MEDIUM"
        prefix = "[Local] " if is_local else ""
        findings.append({
            "id": uid(), "category": "network", "severity": sev,
            "title": f"{prefix}Port {dp['port']} Open ({dp['service']})",
            "description": f"{dp['service']} listening on {dp['address']}:{dp['port']}.{' Localhost only.' if is_local else f' Not expected for {server_type[\"label\"]}.'}",
            "remediation": "Verify this service is required." if is_local else f"Disable service or firewall port {dp['port']}.",
            "value": f"{dp['address']}:{dp['port']}",
        })

# Patches
if patches["security"] > 0:
    findings.append({"id": uid(), "category": "packages", "severity": "HIGH", "title": f"{patches['security']} Security Updates Pending", "description": f"{patches['security']} security patches available.", "remediation": "Run: apt-get upgrade -y", "value": f"{patches['security']} updates"})
if patches["total"] > 0 and patches["security"] == 0:
    findings.append({"id": uid(), "category": "packages", "severity": "MEDIUM", "title": f"{patches['total']} Package Updates Available", "description": "Non-security package updates pending.", "remediation": "Run: apt-get upgrade -y", "value": f"{patches['total']} updates"})
elif patches["total"] == 0:
    findings.append({"id": uid(), "category": "packages", "severity": "INFO", "title": "All Packages Up to Date", "description": "No pending package updates.", "remediation": "No action needed."})

# File Integrity
for fi in file_integrity:
    if fi["status"] == "danger":
        findings.append({"id": uid(), "category": "files", "severity": "HIGH", "title": f"Dangerous Permissions: {fi['path'].split('/')[-1]}", "description": fi["issue"] or "Dangerous permissions.", "remediation": f"chmod 600 {fi['path']}", "value": fi["permissions"]})
    elif fi["status"] == "warning" and fi.get("issue"):
        findings.append({"id": uid(), "category": "files", "severity": "MEDIUM", "title": f"Permission Warning: {fi['path'].split('/')[-1]}", "description": fi["issue"], "remediation": f"Review permissions on {fi['path']}", "value": fi["permissions"]})

# Nginx down
nginx_up = any(s["name"] == "nginx" and s["status"] == "active" for s in services)
if not nginx_up:
    findings.append({"id": uid(), "category": "services", "severity": "CRITICAL", "title": "Nginx is DOWN", "description": "Web server is not running.", "remediation": "Run: systemctl start nginx"})

# System Resources
if metrics["cpuPercent"] > 90:
    findings.append({"id": uid(), "category": "system", "severity": "HIGH", "title": f"CPU Critical: {metrics['cpuPercent']:.1f}%", "description": "CPU usage critically high.", "remediation": "Run: top to identify culprit.", "value": f"{metrics['cpuPercent']:.1f}%"})
elif metrics["cpuPercent"] > 70:
    findings.append({"id": uid(), "category": "system", "severity": "MEDIUM", "title": f"CPU High: {metrics['cpuPercent']:.1f}%", "description": "CPU usage elevated.", "remediation": "Monitor with: top", "value": f"{metrics['cpuPercent']:.1f}%"})

if metrics["memPercent"] > 90:
    findings.append({"id": uid(), "category": "system", "severity": "HIGH", "title": f"Memory Critical: {metrics['memPercent']}%", "description": "Memory usage critically high.", "remediation": "Identify hogs: ps aux --sort=-%mem | head", "value": f"{metrics['memPercent']}%"})

if metrics["diskPercent"] > 90:
    findings.append({"id": uid(), "category": "system", "severity": "CRITICAL", "title": f"Disk Almost Full: {metrics['diskPercent']}%", "description": "Disk usage critical.", "remediation": "Free disk: find /var/log -name '*.gz' -delete", "value": f"{metrics['diskPercent']}%"})
elif metrics["diskPercent"] > 75:
    findings.append({"id": uid(), "category": "system", "severity": "MEDIUM", "title": f"Disk Usage High: {metrics['diskPercent']}%", "description": "Disk filling up.", "remediation": "Monitor disk usage.", "value": f"{metrics['diskPercent']}%"})

# CUPS check
cups_listening = any(p["port"] == 631 for p in ports)
if cups_listening:
    findings.append({"id": uid(), "category": "services", "severity": "MEDIUM", "title": "CUPS Printing Service Running", "description": f"Print service active on {server_type['label']} -- unnecessary.", "remediation": "Remove: snap remove cups OR systemctl stop cups"})

# SSL Certificate
ssl_data = read_file("ssl.txt")
if ssl_data and "|" in ssl_data:
    domain, expiry_str = ssl_data.split("|", 1)
    m = re.search(r'notAfter=(.+)', expiry_str)
    if m:
        try:
            from email.utils import parsedate_to_datetime
            expiry = parsedate_to_datetime(m.group(1))
            days_left = (expiry - datetime.now(expiry.tzinfo)).days
            if days_left < 14:
                findings.append({"id": uid(), "category": "ssl", "severity": "CRITICAL", "title": f"SSL Certificate Expires in {days_left} days", "description": f"Certificate expires on {expiry.strftime('%Y-%m-%d')}", "remediation": "Renew: certbot renew", "value": f"{days_left} days"})
            elif days_left < 30:
                findings.append({"id": uid(), "category": "ssl", "severity": "HIGH", "title": f"SSL Certificate Expires in {days_left} days", "description": f"Certificate expires on {expiry.strftime('%Y-%m-%d')}", "remediation": "Schedule SSL renewal.", "value": f"{days_left} days"})
            else:
                findings.append({"id": uid(), "category": "ssl", "severity": "INFO", "title": f"SSL Certificate Valid ({days_left} days)", "description": f"Certificate expires on {expiry.strftime('%Y-%m-%d')}", "remediation": "No action needed.", "value": f"{days_left} days"})
        except:
            pass

# === Threat Score ===
score = 0
for f in findings:
    if f["severity"] == "CRITICAL": score += 30
    elif f["severity"] == "HIGH": score += 15
    elif f["severity"] == "MEDIUM": score += 5
    elif f["severity"] == "LOW": score += 1
score = min(score, 100)

level = "CRITICAL" if score >= 50 else "HIGH" if score >= 30 else "ELEVATED" if score >= 10 else "LOW"
safe = 100 - score
grade = "A" if safe >= 90 else "B" if safe >= 80 else "C" if safe >= 65 else "D" if safe >= 50 else "F"

# === Final Result ===
result = {
    "timestamp": datetime.now().isoformat(),
    "serverType": server_type,
    "metrics": metrics,
    "findings": findings,
    "ports": ports,
    "services": services,
    "patches": patches,
    "authEvents": auth_events,
    "fileIntegrity": file_integrity,
    "connectionAudit": connection_audit,
    "threatScore": score,
    "threatLevel": level,
    "grade": grade,
}

print(json.dumps(result))
PYEOF
  "$tmpdir")

  # Cleanup temp files
  rm -rf "$tmpdir"

  if [[ -z "$scan_json" || "$scan_json" == "null" ]]; then
    log "ERROR: Security scan failed to produce results"
    echo ""
    return 1
  fi

  log "Security scan complete. Submitting results..."

  # Submit scan results to the dedicated scan endpoint
  local scan_url="${API_URL}/scan"
  local response
  response=$(curl -sS -X POST "$scan_url" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$scan_json" \
    --max-time 30 2>&1) || {
    log "ERROR: Failed to submit scan results — $response"
    echo "Scan completed but failed to submit results"
    return 1
  }

  # Extract grade and score from response
  local grade score findings_count
  grade=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('grade','?'))" 2>/dev/null || echo "?")
  score=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('threatScore',0))" 2>/dev/null || echo "0")
  findings_count=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('findings',0))" 2>/dev/null || echo "0")

  log "Scan results submitted: Grade=$grade Score=$score Findings=$findings_count"
  echo "Security scan completed: Grade=$grade, Threat Score=$score, Findings=$findings_count"
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
        # Export metrics as env vars for the python3 scanner
        local scan_metrics
        scan_metrics=$(collect_metrics)
        export SCAN_CPU=$(echo "$scan_metrics" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cpu',0))" 2>/dev/null || echo "0")
        export SCAN_MEM_TOTAL="$mem_total" SCAN_MEM_USED="$mem_used" SCAN_MEM_PCT="$mem_pct"
        export SCAN_DISK_TOTAL="$disk_total" SCAN_DISK_USED="$disk_used" SCAN_DISK_PCT="$disk_pct"
        export SCAN_LOAD1="$load1" SCAN_LOAD5="$load5" SCAN_LOAD15="$load15"
        export SCAN_UPTIME="$uptime_secs" SCAN_PROCS="$proc_count"
        export SCAN_NET_RX="$net_rx" SCAN_NET_TX="$net_tx"

        # Get fresh metrics for export
        local _cpu _mem_info _df_line _loadavg _uptime _procs _iface _netrx _nettx
        _cpu=$(top -bn1 2>/dev/null | grep "Cpu(s)" | awk '{print $2 + $4}' || echo "0")
        export SCAN_CPU="$_cpu"

        if [[ -f /proc/meminfo ]]; then
          local _mt _mf _mb _mc _ms _mu _mp
          _mt=$(awk '/^MemTotal:/ {print $2 * 1024}' /proc/meminfo)
          _mf=$(awk '/^MemFree:/ {print $2 * 1024}' /proc/meminfo)
          _mb=$(awk '/^Buffers:/ {print $2 * 1024}' /proc/meminfo)
          _mc=$(awk '/^Cached:/ {print $2 * 1024}' /proc/meminfo || echo "0")
          _ms=$(awk '/^SReclaimable:/ {print $2 * 1024}' /proc/meminfo 2>/dev/null || echo "0")
          _mu=$((_mt - _mf - _mb - _mc - _ms))
          (( _mt > 0 )) && _mp=$((_mu * 100 / _mt)) || _mp=0
          export SCAN_MEM_TOTAL="$_mt" SCAN_MEM_USED="$_mu" SCAN_MEM_PCT="$_mp"
        fi

        _df_line=$(df -B1 / 2>/dev/null | tail -1)
        export SCAN_DISK_TOTAL=$(echo "$_df_line" | awk '{print $2}')
        export SCAN_DISK_USED=$(echo "$_df_line" | awk '{print $3}')
        export SCAN_DISK_PCT=$(echo "$_df_line" | awk '{gsub(/%/,"",$5); print $5}')

        read -r _l1 _l5 _l15 _ _ < /proc/loadavg 2>/dev/null || { _l1=0; _l5=0; _l15=0; }
        export SCAN_LOAD1="$_l1" SCAN_LOAD5="$_l5" SCAN_LOAD15="$_l15"

        export SCAN_UPTIME=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo "0")
        export SCAN_PROCS=$(($(ps aux 2>/dev/null | wc -l) - 1))

        _iface=$(ip route 2>/dev/null | grep default | awk '{print $5}' | head -1 || echo "eth0")
        export SCAN_NET_RX=$(grep "$_iface" /proc/net/dev 2>/dev/null | awk '{print $2}' || echo "0")
        export SCAN_NET_TX=$(grep "$_iface" /proc/net/dev 2>/dev/null | awk '{print $10}' || echo "0")

        output=$(run_security_scan 2>&1)
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
    send_heartbeat 2>/dev/null || log "Heartbeat cycle failed"
    sleep "$HEARTBEAT_INTERVAL"
  done
}

main "$@"
