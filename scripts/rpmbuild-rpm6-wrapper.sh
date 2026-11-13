#!/bin/bash
# rpmbuild wrapper for RPM 6.0.x compatibility with fpm 1.9.3 (electron-builder).
#
# RPM 6.0 auto-derives %buildroot as {_builddir}/{name}-{version}-build/BUILDROOT,
# ignoring fpm's --define buildroot. The %mkbuilddir phase also wipes pre-staged files.
# Since RPM's buildroot nests inside fpm's staging dir, we copy staged files to a
# clean temp dir (excluding the RPM build subdir) and point the %install section there.
#
# On RPM < 6.0 (e.g. Ubuntu CI runners with RPM 4.x), fpm's native staging works
# correctly, so we pass through without modification. Spec modifications applied on
# RPM 4.x would break the build by stripping fpm's __spec_install overrides.
#
# All rpmbuild stderr is captured to /tmp/rpmbuild-stderr.log for CI visibility,
# since fpm swallows rpmbuild's error output.
set -euo pipefail

REAL_RPMBUILD=/usr/bin/rpmbuild
STDERR_LOG=/tmp/rpmbuild-stderr.log

# Detect RPM major version to decide whether spec modifications are needed.
RPM_VERSION_OUTPUT="$("$REAL_RPMBUILD" --version 2>/dev/null || true)"
if [[ "$RPM_VERSION_OUTPUT" =~ ([0-9]+) ]]; then
    RPM_MAJOR="${BASH_REMATCH[1]}"
else
    RPM_MAJOR=0
fi

# RPM < 6.0: fpm's native staging works correctly. Pass through unmodified.
if [[ "$RPM_MAJOR" -lt 6 ]]; then
    set +e
    "$REAL_RPMBUILD" "$@" 2>"$STDERR_LOG"
    RC=$?
    set -e
    cat "$STDERR_LOG" >&2 2>/dev/null || true
    exit "$RC"
fi

# RPM >= 6.0: rewrite the spec to work around buildroot/mkbuilddir changes.

SPEC=""
FPM_STAGING=""
declare -a PASS_ARGS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --define)
            def="$2"
            if [[ "$def" == buildroot\ * ]]; then
                FPM_STAGING="${def#buildroot }"
            fi
            PASS_ARGS+=("--define" "$def")
            shift 2
            ;;
        *)
            if [[ "$1" == *.spec && -f "$1" ]]; then
                SPEC="$1"
            fi
            PASS_ARGS+=("$1")
            shift
            ;;
    esac
done

if [[ -n "$SPEC" && -n "$FPM_STAGING" ]]; then
    NAME="$(sed -n 's/^Name:[[:space:]]*//p' "$SPEC" | head -1)"
    VERSION="$(sed -n 's/^Version:[[:space:]]*//p' "$SPEC" | head -1)"
    # RPM 6.0 replaces '~' with '_' in the auto-derived build directory name.
    VERSION_SAFE="${VERSION//\~/_}"
    EXCLUDE="${NAME}-${VERSION_SAFE}-build"

    # Create a clean staging dir with fpm's files, excluding RPM's nested build dir
    CLEAN_STAGING="$(mktemp -d)"
    cd "$FPM_STAGING"
    for item in *; do
        [[ "$item" == "$EXCLUDE" ]] && continue
        [[ -e "$item" || -L "$item" ]] || continue
        cp -a "$item" "$CLEAN_STAGING/"
    done

    MODSPEC="$(mktemp --suffix=.spec)"
    awk -v staging="$CLEAN_STAGING" '
        /^%define __spec_install_pre true$/  { next }
        /^%define __spec_install_post true$/ { next }
        /^%install$/ {
            print
            print "cp -a \"" staging "/.\" \"%{buildroot}/\""
            skip_noop = 1
            next
        }
        skip_noop && /^# noop$/ { skip_noop = 0; next }
        { print }
    ' "$SPEC" > "$MODSPEC"

    for i in "${!PASS_ARGS[@]}"; do
        if [[ "${PASS_ARGS[$i]}" == "$SPEC" ]]; then
            PASS_ARGS[$i]="$MODSPEC"
        fi
    done
fi

set +e
"$REAL_RPMBUILD" "${PASS_ARGS[@]}" 2>"$STDERR_LOG"
RC=$?
set -e
cat "$STDERR_LOG" >&2 2>/dev/null || true
exit "$RC"
