#!/usr/bin/env bash
# PreToolUse hook: blocks reading constants.js (contains sensitive data).
input=$(cat)

tool_name=$(jq -r '.tool_name // empty' <<<"$input")
target=$(jq -r '.tool_input.file_path // .tool_input.path // .tool_input.command // empty' <<<"$input")

blocked=0
case "$tool_name" in
  Read|Grep)
    [[ "$(basename -- "$target")" == "constants.js" ]] && blocked=1
    ;;
  Bash)
    grep -Eq '(^|[^[:alnum:]_.-])constants\.js([^[:alnum:]_.-]|$)' <<<"$target" && blocked=1
    ;;
esac

if [[ $blocked -eq 1 ]]; then
  jq -n '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "No puedo leer este archivo"}}'
fi
exit 0
