#!/usr/bin/env bash
# Applies bookmarks-import-export's public repo security posture (see
# docs/adr/0001-public-repo-security-posture.md) to a target GitHub repo via
# `gh api`. Idempotent: safe to re-run against the same repo.
#
# Usage: scripts/repo-settings/apply.sh <owner/repo>
#
# Temporary tool: kept only until this repo migrates to
# AndryOre/bookmarks-import-export. Delete scripts/repo-settings/ once this
# script has been re-run against the new repo.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <owner/repo>" >&2
  exit 1
fi

REPO="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WARNINGS=0

warn() {
  echo "WARNING: $*" >&2
  WARNINGS=$((WARNINGS + 1))
}

step() {
  echo "==> $*"
}

# Runs `gh api "$@"`, printing a warning and continuing (instead of aborting
# the whole script) if the call fails.
gh_api_warn() {
  local desc="$1"
  shift
  local output
  if ! output=$(gh api "$@" 2>&1); then
    warn "${desc} failed: ${output}"
    return 0
  fi
}

apply_ruleset() {
  local file="$1"
  local name
  name=$(jq -r '.name' "${file}")

  step "Applying ruleset '${name}' from ${file}"

  local existing_id
  existing_id=$(gh api "repos/${REPO}/rulesets?per_page=100" --paginate 2>/dev/null |
    jq -r --arg name "${name}" '.[] | select(.name == $name) | .id' | head -n1 || true)

  if [[ -n "${existing_id}" ]]; then
    gh_api_warn "Update ruleset '${name}'" \
      -X PUT "repos/${REPO}/rulesets/${existing_id}" --input "${file}"
  else
    gh_api_warn "Create ruleset '${name}'" \
      -X POST "repos/${REPO}/rulesets" --input "${file}"
  fi
}

apply_workflow_execution_protections() {
  step "Applying workflow execution protections"

  local name="restrict-workflow-triggers"
  local payload
  payload=$(jq -n \
    --arg name "${name}" \
    '{
      name: $name,
      enforcement: "active",
      rules: [
        {
          type: "restrict_action_events",
          parameters: {
            allowed_events: [
              "pull_request",
              "push",
              "schedule",
              "workflow_dispatch",
              "branch_protection_rule"
            ]
          }
        }
      ]
    }')

  local existing_id
  existing_id=$(gh api "repos/${REPO}/actions/policies?per_page=100" --paginate 2>/dev/null |
    jq -r --arg name "${name}" '.policies[] | select(.name == $name) | .id' | head -n1 || true)

  if [[ -n "${existing_id}" ]]; then
    gh_api_warn "Update workflow execution protections policy '${name}'" \
      -X PUT "repos/${REPO}/actions/policies/${existing_id}" --input - <<<"${payload}"
  else
    gh_api_warn "Create workflow execution protections policy '${name}'" \
      -X POST "repos/${REPO}/actions/policies" --input - <<<"${payload}"
  fi
}

step "Target repo: ${REPO}"

# --- Rulesets ---------------------------------------------------------
apply_ruleset "${SCRIPT_DIR}/main-ruleset.json"
apply_ruleset "${SCRIPT_DIR}/tags-ruleset.json"

# --- Merge settings -----------------------------------------------------
step "Applying merge settings"
gh_api_warn "Merge settings" \
  -X PATCH "repos/${REPO}" \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=COMMIT_MESSAGES \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true \
  -F allow_auto_merge=true \
  -F allow_update_branch=true

# --- Security -------------------------------------------------------------
step "Enabling private vulnerability reporting"
gh_api_warn "Private vulnerability reporting" \
  -X PUT "repos/${REPO}/private-vulnerability-reporting"

step "Enabling secret scanning non-provider patterns"
SECRET_SCANNING_STATUS=$(gh api -X PATCH "repos/${REPO}" \
  -f 'security_and_analysis[secret_scanning_non_provider_patterns][status]=enabled' \
  --jq '.security_and_analysis.secret_scanning_non_provider_patterns.status' 2>&1) ||
  warn "secret_scanning_non_provider_patterns failed: ${SECRET_SCANNING_STATUS}"
if [[ "${SECRET_SCANNING_STATUS:-}" != "enabled" ]]; then
  warn "secret_scanning_non_provider_patterns was not enabled (GitHub returned status: '${SECRET_SCANNING_STATUS:-unknown}'); this likely requires a plan/feature this repo does not have. Continuing."
fi

# --- Actions ---------------------------------------------------------------
step "Applying Actions permissions"
gh_api_warn "Actions permissions" \
  -X PUT "repos/${REPO}/actions/permissions" \
  -F enabled=true \
  -f allowed_actions=all \
  -F sha_pinning_required=true

step "Applying fork-PR contributor approval policy"
gh_api_warn "Fork-PR contributor approval" \
  -X PUT "repos/${REPO}/actions/permissions/fork-pr-contributor-approval" \
  -f approval_policy=all_external_contributors

apply_workflow_execution_protections

# --- Features / metadata ----------------------------------------------
step "Applying features and metadata"
DESCRIPTION=$(jq -r '.description' "${SCRIPT_DIR}/../../package.json")
HOMEPAGE="https://chromewebstore.google.com/detail/bookmark-importexport/gdhpeilfkeeajillmcncaelnppiakjhn"

gh_api_warn "Features and metadata" \
  -X PATCH "repos/${REPO}" \
  -F has_wiki=false \
  -F has_projects=false \
  -f description="${DESCRIPTION}" \
  -f homepage="${HOMEPAGE}"

gh_api_warn "Topics" \
  -X PUT "repos/${REPO}/topics" \
  -f 'names[]=browser-extension' \
  -f 'names[]=bookmarks' \
  -f 'names[]=chrome-extension' \
  -f 'names[]=wxt' \
  -f 'names[]=react' \
  -f 'names[]=typescript'

# --- Immutable releases ------------------------------------------------
step "Enabling immutable releases"
gh_api_warn "Immutable releases" \
  -X PUT "repos/${REPO}/immutable-releases"

if [[ "${WARNINGS}" -gt 0 ]]; then
  echo ""
  echo "Completed with ${WARNINGS} warning(s) — see above. Every refusal was logged; none were skipped silently." >&2
else
  echo ""
  echo "Completed with no warnings."
fi
