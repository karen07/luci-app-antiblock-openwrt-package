#!/bin/sh
# Locate the AntiBlock dependency next to the freshly built LuCI package.
set -eu

[ "$#" -eq 2 ] || {
    echo 'usage: find-built-antiblock.sh <sdk-dir> <build-marker>' >&2
    exit 1
}
[ -d "$1" ] || {
    echo "SDK directory does not exist: $1" >&2
    exit 1
}
[ -f "$2" ] || {
    echo "Build start marker not found: $2" >&2
    exit 1
}

luci=$(find "$1" -type f -newer "$2" \
    -path '*/bin/packages/x86_64/*/luci-app-antiblock-*.apk' -print)
case "$luci" in
    '' | *'
'*)
        echo 'Expected exactly one freshly built LuCI APK in the SDK cache' >&2
        printf '%s\n' "$luci" >&2
        exit 1
        ;;
    *) : ;;
esac
# A cached dependency is valid only inside the SDK that built this LuCI APK.
feed_dir=$(dirname "$(dirname "$luci")")
set -- "$feed_dir"/packages/antiblock-*.apk
[ "$#" -eq 1 ] && [ -f "$1" ] || {
    echo 'Expected exactly one AntiBlock APK in the same SDK packages feed' >&2
    exit 1
}
printf '%s\n' "$1"
