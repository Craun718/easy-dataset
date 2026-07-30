#!/bin/bash
# Sets up the rpmbuild wrapper for RPM 6.0 compatibility with fpm/electron-builder,
# and ensures the RPM database exists (needed on Debian/Ubuntu CI runners where
# /var/lib/rpm is not initialized because the distro doesn't use RPM natively).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WRAPPER="$SCRIPT_DIR/rpmbuild-rpm6-wrapper.sh"

mkdir -p /tmp/rpmbuild-bin
ln -sf "$WRAPPER" /tmp/rpmbuild-bin/rpmbuild
chmod +x "$WRAPPER"

# On non-RPM distros (Ubuntu/Debian), /var/lib/rpm may not exist.
# RPM 4.x treats the missing database as a fatal error during package creation.
# Initialize it if needed (idempotent — no-op if it already exists).
if ! rpm -qa >/dev/null 2>&1; then
    rpm --initdb 2>/dev/null || sudo rpm --initdb 2>/dev/null || true
fi

echo "rpmbuild wrapper installed at /tmp/rpmbuild-bin/rpmbuild"
