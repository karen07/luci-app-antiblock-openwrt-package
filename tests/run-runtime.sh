#!/bin/sh
# Actual OpenWrt + LuCI E2E runtime, following the AntiBlock package Docker test.
set -eu

ROOT_DIR=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)
TEST_DIR="$ROOT_DIR/tests"
OPENWRT_VERSION=${OPENWRT_VERSION:-SNAPSHOT}
ROOTFS_IMAGE=${OPENWRT_ROOTFS_IMAGE:-ghcr.io/openwrt/rootfs:x86_64-$OPENWRT_VERSION}
RUNTIME_IMAGE="antiblock-luci-e2e:${OPENWRT_VERSION}-$$"
STAGE="antiblock-luci-stage-$$"
RUNTIME="antiblock-luci-runtime-$$"
NETWORK="antiblock-luci-net-$$"
E2E_PASSWORD=${E2E_PASSWORD:-antiblock-luci-e2e-only}
E2E_KEEP=${E2E_KEEP:-0}
# One cached image derived from the official Playwright Docker image.
PLAYWRIGHT_VERSION=1.64.1
PLAYWRIGHT_IMAGE="antiblock-luci-browser:v${PLAYWRIGHT_VERSION}-mcr"
ARTIFACT_DIR="$TEST_DIR/.artifacts"

cleanup() {
    if [ "$E2E_KEEP" = 1 ]; then
        printf '[INFO] Keeping E2E Docker containers and network\n'
        return
    fi
    docker rm -f "$RUNTIME" "$STAGE" >/dev/null 2>&1 || true
    docker network rm "$NETWORK" >/dev/null 2>&1 || true
    docker image rm "$RUNTIME_IMAGE" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

fail() {
    printf '\n[FAIL] %s\n' "$*" >&2
    exit 1
}
case "$OPENWRT_VERSION" in
    master | MASTER | snapshot)
        fail 'Use OPENWRT_VERSION=SNAPSHOT (not master) for the OpenWrt main branch'
        ;;
    *) : ;;
esac
printf '%s\n' "$OPENWRT_VERSION" \
    | grep -Eq '^(SNAPSHOT|[0-9]+\.[0-9]+(-SNAPSHOT|\.[0-9]+))$' \
    || fail "Unsupported version: $OPENWRT_VERSION (SNAPSHOT, N.N-SNAPSHOT or N.N.N)"

[ "$#" -eq 2 ] || fail 'usage: tests/run-runtime.sh <luci.apk> <antiblock.apk>'
[ -f "$1" ] || fail "LuCI APK not found: $1"
[ -f "$2" ] || fail "AntiBlock APK not found: $2"
case "$(basename "$1")" in
    luci-app-antiblock-*.apk | luci-app-antiblock_v*.apk) : ;;
    *) fail "Unexpected LuCI APK name: $1" ;;
esac
case "$(basename "$2")" in
    antiblock-*.apk | antiblock_v*.apk) : ;;
    *) fail "Unexpected AntiBlock APK name: $2" ;;
esac
command -v docker >/dev/null 2>&1 || fail 'docker is required'
docker info >/dev/null 2>&1 || fail 'Docker daemon unavailable'

# The official image already contains Chromium and its OS dependencies.
# Build only a small cached layer with the JS test library once.
if ! docker image inspect "$PLAYWRIGHT_IMAGE" >/dev/null 2>&1; then
    printf '[INFO] Preparing browser image using cached Microsoft Playwright base\n'
    docker build --platform linux/amd64 \
        -t "$PLAYWRIGHT_IMAGE" - <"$TEST_DIR/Dockerfile.browser" \
        || fail 'Cannot prepare browser image (JS dependency installation failed)'
fi

# Moving snapshots must not silently reuse an old cached OpenWrt rootfs.
case "$OPENWRT_VERSION" in
    SNAPSHOT | *-SNAPSHOT) PULL_ROOTFS=1 ;;
    *)
        PULL_ROOTFS=0
        docker image inspect "$ROOTFS_IMAGE" >/dev/null 2>&1 || PULL_ROOTFS=1
        ;;
esac
if [ "$PULL_ROOTFS" -eq 1 ]; then
    docker pull --platform linux/amd64 "$ROOTFS_IMAGE" \
        || fail 'Cannot download official OpenWrt rootfs'
fi

# Preparation is done with working Internet/DNS, before procd is started.
# The OpenWrt package test uses the same staging -> commit -> /sbin/init flow.
docker run -d --name "$STAGE" "$ROOTFS_IMAGE" \
    /bin/sh -c 'while :; do sleep 3600; done' >/dev/null \
    || fail 'Cannot launch staging rootfs'

# OpenWrt nightly rootfs images may be bootstrap images with setup.sh only.
docker exec "$STAGE" /bin/sh -ec '
    if [ ! -x /sbin/init ]; then
        for script in /setup.sh /root/setup.sh /builder/setup.sh; do
            if [ -f "$script" ]; then
                cd / && /bin/sh "$script"
                break
            fi
        done
    fi
    test -x /sbin/init
    command -v apk
' || fail 'Cannot prepare OpenWrt rootfs (including nightly setup.sh)'
docker cp "$1" "$STAGE:/tmp/luci-app-antiblock.apk" || fail 'Cannot copy LuCI APK'
docker cp "$2" "$STAGE:/tmp/antiblock.apk" || fail 'Cannot copy AntiBlock APK'

docker exec "$STAGE" /bin/ash -ec '
    mkdir -p /var/lock
    apk update
    apk add luci
    # Install both APKs from the same SDK build. The online feed is used
    # only for other dependencies, never to substitute another AntiBlock.
    apk add --allow-untrusted /tmp/antiblock.apk /tmp/luci-app-antiblock.apk
    apk info -e antiblock
    apk info -e luci-app-antiblock
    command -v antiblock
    test -x /etc/init.d/antiblock
    test -e /www/luci-static/resources/view/antiblock/args.js
    test -e /usr/share/rpcd/acl.d/luci-app-antiblock.json
    command -v uhttpd
    command -v rpcd

    # ujail namespace creation is denied by non-privileged Docker; as with
    # the AntiBlock package E2E, disable *only* test-image jail declarations.
    for service in uhttpd rpcd; do
        if [ -f "/etc/init.d/$service" ]; then
            sed -i "s/procd_add_jail/: &/g" "/etc/init.d/$service"
        fi
    done
    rm -f /tmp/luci-app-antiblock.apk /tmp/antiblock.apk
' || fail 'Cannot install locally built LuCI and AntiBlock APKs in OpenWrt rootfs'

# Test-only password; the published port below is bound strictly to host loopback.
docker exec -e "E2E_PASSWORD=$E2E_PASSWORD" "$STAGE" /bin/ash -ec \
    'printf "%s\n%s\n" "$E2E_PASSWORD" "$E2E_PASSWORD" | passwd root' \
    || fail 'Cannot assign root password in disposable OpenWrt image'
docker commit "$STAGE" "$RUNTIME_IMAGE" >/dev/null \
    || fail 'Cannot commit prepared rootfs'
docker rm -f "$STAGE" >/dev/null || fail 'Cannot stop staging container'

docker network create "$NETWORK" >/dev/null || fail 'Cannot create Docker network'
docker run -d \
    --name "$RUNTIME" \
    --hostname openwrt-luci-e2e \
    --cap-add NET_ADMIN --cap-add NET_RAW --cap-drop MKNOD \
    --network "$NETWORK" \
    -p 127.0.0.1::80 \
    -v "$TEST_DIR:/tests:ro" \
    "$RUNTIME_IMAGE" /bin/ash /tests/openwrt-init.sh >/dev/null \
    || fail 'Cannot boot OpenWrt runtime'

booted=0
attempt=0
while [ "$attempt" -lt 60 ]; do
    if docker exec "$RUNTIME" ubus call system board >/dev/null 2>&1; then
        booted=1
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done
[ "$booted" -eq 1 ] || fail 'OpenWrt procd/ubus did not start'
printf '[PASS] Real OpenWrt procd/ubus started\n'

# Create real UCI configuration and diagnostic/domain files in the container.
# Seed data is deliberately not generated with any mocked browser APIs.
docker exec "$RUNTIME" /bin/ash -ec '
    # The stock config is disabled. Do not let a running daemon overwrite fixtures.
    if pidof antiblock >/dev/null; then
        /etc/init.d/antiblock stop
    fi
    if pidof antiblock >/dev/null; then
        echo "AntiBlock is still running before fixture setup" >&2
        exit 1
    fi
    cat >/etc/config/antiblock <<"EOCONF"
config main "config"
        option enabled "1"
        option listen "127.0.0.1:55333"
        option log "1"
        option stat "1"
        option test "1"

config route
        option enabled "1"
        option interface "eth0"
        option domains_path "/etc/antiblock/e2e-domains.txt"
EOCONF
    mkdir -p /etc/antiblock /tmp/antiblock
    printf "%s\\n" "# E2E header" "example.org" "" "!exact.example.org" \
        > /etc/antiblock/e2e-domains.txt
    printf "<12>luci-e2e-log-marker\\n" > /tmp/antiblock/log.txt
    printf "<12>luci-e2e-stat-marker\\n" > /tmp/antiblock/stat.txt
    uci -q commit antiblock
    /etc/init.d/rpcd start
    /etc/init.d/uhttpd start
' || fail 'Cannot configure real OpenWrt UCI/rpcd/uhttpd'

# An unauthenticated LuCI CGI request deliberately returns HTTP 403 and
# X-LuCI-Login-Required: yes. Check HTTP readiness here; browser.js verifies
# the CGI login response and checks authenticated LuCI views separately.
ready=0
attempt=0
while [ "$attempt" -lt 60 ]; do
    if docker exec "$RUNTIME" /bin/ash -ec '
        wget --no-proxy -q -O /dev/null http://127.0.0.1/
        wget --no-proxy -q -O /dev/null \
            http://127.0.0.1/luci-static/resources/luci.js
    '; then
        ready=1
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done
if [ "$ready" -ne 1 ]; then
    printf '[INFO] OpenWrt HTTP diagnostics:\n' >&2
    docker exec "$RUNTIME" /bin/ash -c '
        ubus call service list "{\"name\":\"uhttpd\"}" 2>&1 || true
        netstat -lnt 2>&1 || true
        wget --no-proxy -T 5 -O /dev/null \
            http://127.0.0.1/cgi-bin/luci/ 2>&1 || true
        logread 2>&1 | tail -30 || true
    ' >&2 || true
    docker logs "$RUNTIME" >&2 || true
    fail 'OpenWrt HTTP/static resources unavailable (see diagnostics above)'
fi
printf '[PASS] OpenWrt HTTP server and LuCI static resources respond\n'

# The browser is completely isolated from Arch Linux. Playwright and Chromium
# run in a dedicated container on the same Docker network as OpenWrt.
mkdir -p "$ARTIFACT_DIR"
printf '[INFO] Browser image: %s\n' "$PLAYWRIGHT_IMAGE"
docker run --rm --init --shm-size=512m \
    --network "$NETWORK" \
    -v "$TEST_DIR:/tests:ro" \
    -v "$ARTIFACT_DIR:/artifacts" \
    -e "E2E_LUCI_URL=http://$RUNTIME" \
    -e "E2E_PASSWORD=$E2E_PASSWORD" \
    -e "E2E_SCREENSHOTS=${E2E_SCREENSHOTS:-0}" \
    "$PLAYWRIGHT_IMAGE" node /tests/browser.js || fail 'Browser/OpenWrt E2E checks failed'
printf '\n[PASS] All real LuCI/OpenWrt E2E checks passed\n'
