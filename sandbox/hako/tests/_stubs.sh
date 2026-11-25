#!/usr/bin/env bash

install_network_stubs() {
  local bin="$1" iptables_log="$2" ipset_log="$3"

  cat > "$bin/iptables" <<EOF
#!/bin/sh
printf '%s\n' "\$*" >> "$iptables_log"
exit 0
EOF
  chmod +x "$bin/iptables"

  cat > "$bin/ipset" <<EOF
#!/bin/sh
printf '%s\n' "\$*" >> "$ipset_log"
exit 0
EOF
  chmod +x "$bin/ipset"

  cat > "$bin/ip" <<'EOF'
#!/bin/sh
echo "default via 10.0.0.1 dev eth0 src 10.0.0.5"
exit 0
EOF
  chmod +x "$bin/ip"

  cat > "$bin/dig" <<'EOF'
#!/bin/sh
domain=""
for a; do domain="$a"; done
if [ -n "${DIG_FAIL_DOMAIN:-}" ] && [ "$domain" = "$DIG_FAIL_DOMAIN" ]; then
  exit 0
fi
printf '%s. 300 IN A 93.184.216.10\n' "$domain"
EOF
  chmod +x "$bin/dig"

  cat > "$bin/curl" <<'EOF'
#!/bin/sh
url=""
for a; do
  case "$a" in
    http*) url="$a" ;;
  esac
done
case "$url" in
  *example.com*)
    [ "${CURL_BLOCKED_REACHABLE:-0}" = "1" ] && exit 0
    exit 7
    ;;
  *)
    exit 0
    ;;
esac
EOF
  chmod +x "$bin/curl"
}
