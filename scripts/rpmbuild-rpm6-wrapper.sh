#!/bin/bash
# rpmbuild wrapper for RPM 6.0.x compatibility with fpm 1.9.3 (electron-builder).
#
# RPM 6.0 auto-derives %buildroot as {_builddir}/{name}-{version}-build/BUILDROOT,
# ignoring fpm's --define buildroot. The %mkbuilddir phase also wipes pre-staged files.
# Since RPM's buildroot nests inside fpm's staging dir, we copy staged files to a
# clean temp dir (excluding the RPM build subdir) and point the %install section there.
set -euo pipefail

REAL_RPMBUILD=/usr/bin/rpmbuild

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
    EXCLUDE="${NAME}-${VERSION}-build"

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

exec "$REAL_RPMBUILD" "${PASS_ARGS[@]}"
