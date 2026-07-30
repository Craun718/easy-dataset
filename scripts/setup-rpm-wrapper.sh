#!/bin/bash
# Sets up the rpmbuild wrapper for RPM 6.0 compatibility with fpm/electron-builder.
# Creates a symlink in /tmp/rpmbuild-bin that shadows /usr/bin/rpmbuild via PATH.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WRAPPER="$SCRIPT_DIR/rpmbuild-rpm6-wrapper.sh"

mkdir -p /tmp/rpmbuild-bin
ln -sf "$WRAPPER" /tmp/rpmbuild-bin/rpmbuild
chmod +x "$WRAPPER"

echo "rpmbuild wrapper installed at /tmp/rpmbuild-bin/rpmbuild"
