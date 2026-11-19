#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENTS="$SCRIPT_DIR/agents.sh"
RESOLV_CONF="${RESOLV_CONF:-/etc/resolv.conf}"

AGENT_NAME="${1:-}"
if [[ -z "$AGENT_NAME" ]]; then
  echo "ERROR: usage: init-firewall.sh <agent-name>" >&2
  exit 1
fi

ALLOWLIST="$("$AGENTS" allowlist "$AGENT_NAME")"

iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

NAMESERVER="$(awk '/^nameserver/ { print $2; exit }' "$RESOLV_CONF" 2>/dev/null || true)"
if [[ -z "$NAMESERVER" ]]; then
  echo "ERROR: no nameserver found in $RESOLV_CONF" >&2
  exit 1
fi
iptables -A OUTPUT -p udp -d "$NAMESERVER" --dport 53 -j ACCEPT
iptables -A INPUT -p udp -s "$NAMESERVER" --sport 53 -j ACCEPT

iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT

iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

ipset create allowed-domains hash:net comment

for domain in $ALLOWLIST; do
  echo "Resolving $domain..."
  answer="$(dig +noall +answer A "$domain" 2>/dev/null || true)"
  ips="$(printf '%s\n' "$answer" | awk '$4 == "A" { print $5 }')"
  if [[ -z "$ips" ]]; then
    echo "ERROR: failed to resolve $domain" >&2
    exit 1
  fi
  while read -r ip; do
    [[ -z "$ip" ]] && continue
    ipset add allowed-domains "$ip" comment "$domain"
  done <<<"$ips"
done

GATEWAY="$(ip route 2>/dev/null | awk '/^default/ { print $3; exit }' || true)"
if [[ -z "$GATEWAY" ]]; then
  echo "ERROR: failed to detect the default route gateway" >&2
  exit 1
fi
iptables -A INPUT -s "$GATEWAY" -j ACCEPT
iptables -A OUTPUT -d "$GATEWAY" -j ACCEPT

iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited

echo "Firewall configuration complete"

echo "Verifying firewall rules..."
if curl --connect-timeout 5 -s -o /dev/null "https://example.com"; then
  echo "ERROR: firewall verification failed - was able to reach https://example.com" >&2
  exit 1
fi
echo "Firewall verification passed - unable to reach https://example.com as expected"

first_allowed_domain="$(echo "$ALLOWLIST" | awk '{ print $1 }')"
if ! curl --connect-timeout 5 -s -o /dev/null "https://$first_allowed_domain"; then
  echo "ERROR: firewall verification failed - unable to reach https://$first_allowed_domain" >&2
  exit 1
fi
echo "Firewall verification passed - able to reach https://$first_allowed_domain as expected"
