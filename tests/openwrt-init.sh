#!/bin/ash
set -eu

# Use the actual IP assigned by Docker; netifd must not replace it with a
# different default LAN address. No host network or privileged Docker is used.
[ ! -e /dev/watchdog ] && [ ! -e /dev/watchdog0 ] || {
    echo 'Hardware watchdog must not be visible in E2E Docker' >&2
    exit 1
}

E2E_IP=$(ip -4 -o addr show dev eth0 | awk 'NR == 1 {split($4, a, "/"); print a[1]}')
E2E_GATEWAY=$(ip -4 route show default | awk 'NR == 1 {print $3}')
[ -n "$E2E_IP" ] && [ -n "$E2E_GATEWAY" ] || {
    echo 'Cannot detect Docker IPv4 address and gateway' >&2
    exit 1
}

cat >/etc/config/network <<EONET
config interface 'loopback'
        option device 'lo'
        option proto 'static'
        option ipaddr '127.0.0.1'
        option netmask '255.0.0.0'

config interface 'lan'
        option device 'eth0'
        option proto 'static'
        option ipaddr '$E2E_IP'
        option netmask '255.255.255.0'
        option gateway '$E2E_GATEWAY'
EONET

# Disable a DHCP server in this disposable web-UI test, not in package files.
if uci -q get dhcp.lan >/dev/null 2>&1; then
    uci -q set dhcp.lan.ignore=1
    uci -q commit dhcp
fi

exec /sbin/init
