#!/bin/sh
# Build ONLY luci-app-antiblock. The official OpenWrt packages feed supplies
# AntiBlock as a dependency through LUCI_DEPENDS; do not stage its sources.
set -eu

ROOT_DIR=$(CDPATH='' cd "$(dirname "$0")/.." && pwd)
TEST_DIR="$ROOT_DIR/tests"
BUILDER_COPY="$ROOT_DIR/.openwrt-build-e2e.sh"
ARTIFACT_DIR="$TEST_DIR/.artifacts"
OPENWRT_VERSION=${OPENWRT_VERSION:-SNAPSHOT}
export OPENWRT_VERSION

fail() {
    printf '[FAIL] %s\n' "$*" >&2
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

[ -f "$ROOT_DIR/luci-app-antiblock/Makefile" ] || fail 'LuCI package not found'
command -v docker >/dev/null 2>&1 || fail 'docker is required'
docker info >/dev/null 2>&1 || fail 'Docker daemon is unavailable'

if [ -n "${E2E_LUCI_APK:-}" ] || [ -n "${E2E_ANTIBLOCK_APK:-}" ]; then
    [ -n "${E2E_LUCI_APK:-}" ] && [ -n "${E2E_ANTIBLOCK_APK:-}" ] \
        || fail 'Set both E2E_LUCI_APK and E2E_ANTIBLOCK_APK for prebuilt testing'
    [ -f "$E2E_LUCI_APK" ] || fail "LuCI APK not found: $E2E_LUCI_APK"
    [ -f "$E2E_ANTIBLOCK_APK" ] || fail "AntiBlock APK not found: $E2E_ANTIBLOCK_APK"
    LUCI_APK=$E2E_LUCI_APK
    ANTIBLOCK_APK=$E2E_ANTIBLOCK_APK
else
    PARENT_DIR=$(dirname "$ROOT_DIR")
    DEFAULT_BUILDER="$PARENT_DIR/openwrt-package-ci/openwrt-build.sh"
    OPENWRT_BUILD_SH=${OPENWRT_BUILD_SH:-$DEFAULT_BUILDER}
    [ -f "$OPENWRT_BUILD_SH" ] \
        || fail "Missing shared OpenWrt builder: $OPENWRT_BUILD_SH"
    mkdir -p "$ARTIFACT_DIR"

    # Like the package E2E, run a disposable copy of the shared builder.
    # It reads openwrt-build.env relative to its location. Build only LuCI;
    # the official packages feed resolves +antiblock automatically.
    cp "$OPENWRT_BUILD_SH" "$BUILDER_COPY"
    chmod +x "$BUILDER_COPY"
    rm -f "$ARTIFACT_DIR"/luci-app-antiblock_v*.apk

    # Only select the AntiBlock APK produced during THIS build. An SDK cache
    # can legitimately contain packages for multiple OpenWrt versions.
    BUILD_MARKER="$ROOT_DIR/.openwrt-build/.apk-build-start"
    mkdir -p "$ROOT_DIR/.openwrt-build"
    touch "$BUILD_MARKER"
    printf '%s\n' '[INFO] Building LuCI with AntiBlock as an SDK dependency'
    "$BUILDER_COPY" build-target luci-app-antiblock \
        "$OPENWRT_VERSION" x86 64 x86_64 "$ARTIFACT_DIR" \
        || fail 'OpenWrt SDK LuCI build failed'
    rm -f "$BUILDER_COPY"

    LUCI_APK="$ARTIFACT_DIR/luci-app-antiblock_v${OPENWRT_VERSION}_x86_64_x86_64.apk"
    [ -f "$LUCI_APK" ] || fail "LuCI APK missing: $LUCI_APK"

    # The SDK has already built AntiBlock as LUCI_DEPENDS. The shared builder
    # exports only the selected LuCI APK; locate the dependency in the SDK.
    ANTIBLOCK_APK=$(
        "$TEST_DIR/find-built-antiblock.sh" \
            "$ROOT_DIR/.openwrt-build" "$BUILD_MARKER"
    ) || fail 'Cannot find exactly one x86_64 AntiBlock APK built by the same SDK'
fi

printf '[PASS] LuCI APK: %s\n' "$LUCI_APK"
printf '[PASS] AntiBlock APK (same SDK): %s\n' "$ANTIBLOCK_APK"
exec "$TEST_DIR/run-runtime.sh" "$LUCI_APK" "$ANTIBLOCK_APK"
