#!/usr/bin/env bash
# Syncs GitHub Actions secrets from the MonsieurTis 1Password vault into
# the `production` GitHub Environment of the current repo.
#
# Scans .github/workflows/*.yml for `${{ secrets.NAME }}` references.
# For each NAME, finds a vault item whose title is exactly NAME or ends
# in ".NAME" (e.g. "civo.kube.KUBE_API_ALLOWED_CIDR" matches
# KUBE_API_ALLOWED_CIDR), reads its `password` field, and uploads to the
# environment via `gh secret set --env`.
#
# Missing items are logged at the end; the script never aborts on a
# single failure.

set -o pipefail

VAULT="MonsieurTis"
ENVIRONMENT="production"
WORKFLOW_DIR=".github/workflows"
SKIP=("GITHUB_TOKEN") # auto-provided by GitHub Actions

# --- Preflight --------------------------------------------------------------
for cmd in op gh jq grep; do
    command -v "$cmd" >/dev/null || {
        echo "error: '$cmd' not installed" >&2
        exit 1
    }
done

op whoami >/dev/null 2>&1 || {
    echo "error: 'op' not signed in. Run: eval \$(op signin)" >&2
    exit 1
}

gh auth status >/dev/null 2>&1 || {
    echo "error: 'gh' not signed in. Run: gh auth login" >&2
    exit 1
}

# --- Discover secrets referenced in workflows -------------------------------
# `mapfile` is bash 4+, so it's unavailable on stock macOS bash 3.2. Use a
# portable `while read` loop instead.
secrets=()
while IFS= read -r line; do
    [ -n "$line" ] && secrets+=("$line")
done < <(
    grep -rhoE 'secrets\.[A-Za-z_][A-Za-z0-9_]*' "$WORKFLOW_DIR" 2>/dev/null \
        | sed 's/^secrets\.//' \
        | sort -u
)

filtered=()
for s in "${secrets[@]}"; do
    skipped=false
    for x in "${SKIP[@]}"; do
        [ "$s" = "$x" ] && skipped=true && break
    done
    $skipped || filtered+=("$s")
done
secrets=("${filtered[@]}")

if [ ${#secrets[@]} -eq 0 ]; then
    echo "No secrets referenced in $WORKFLOW_DIR. Nothing to sync."
    exit 0
fi

echo "Found ${#secrets[@]} secret(s) referenced in workflows; syncing to environment '$ENVIRONMENT':"
for s in "${secrets[@]}"; do echo "  - $s"; done
echo

# --- Pull vault item titles once --------------------------------------------
titles=()
while IFS= read -r line; do
    [ -n "$line" ] && titles+=("$line")
done < <(op item list --vault "$VAULT" --format=json | jq -r '.[].title')
if [ ${#titles[@]} -eq 0 ]; then
    echo "error: vault '$VAULT' has no items, or signed-in user lacks access" >&2
    exit 1
fi

# --- Sync -------------------------------------------------------------------
synced=()
missing=()

for secret in "${secrets[@]}"; do
    matches=()
    for title in "${titles[@]}"; do
        if [ "$title" = "$secret" ] || [[ "$title" == *".$secret" ]]; then
            matches+=("$title")
        fi
    done

    if [ ${#matches[@]} -eq 0 ]; then
        missing+=("$secret  (no vault item matches)")
        printf "  %-12s %s\n" "[missing]" "$secret"
        continue
    fi

    if [ ${#matches[@]} -gt 1 ]; then
        missing+=("$secret  (ambiguous: ${matches[*]})")
        printf "  %-12s %s -- matches: %s\n" "[ambiguous]" "$secret" "${matches[*]}"
        continue
    fi

    match="${matches[0]}"
    value=$(op item get "$match" --vault "$VAULT" --reveal --field password 2>/dev/null || true)

    if [ -z "$value" ]; then
        missing+=("$secret  (item '$match' has no password field)")
        printf "  %-12s %s -- '%s' has no password field\n" "[no value]" "$secret" "$match"
        continue
    fi

    # Pipe via stdin: avoids argv quoting issues for multi-line values
    # (SSH keys, PEMs) and very long secrets.
    if err=$(printf '%s' "$value" | gh secret set "$secret" --env "$ENVIRONMENT" 2>&1 >/dev/null); then
        synced+=("$secret")
        printf "  %-12s %s  <-  %s\n" "[synced]" "$secret" "$match"
    else
        missing+=("$secret  (gh secret set failed: $err)")
        printf "  %-12s %s -- 'gh secret set' failed: %s\n" "[failed]" "$secret" "$err"
    fi
done

# --- Summary ----------------------------------------------------------------
echo
echo "Synced ${#synced[@]} / ${#secrets[@]} secret(s)."
if [ ${#missing[@]} -gt 0 ]; then
    echo
    echo "Missing or skipped (${#missing[@]}):"
    for m in "${missing[@]}"; do
        echo "  - $m"
    done
fi
