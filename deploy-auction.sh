#!/usr/bin/env sh
set -eu

JSON_FILE="json-parameter.json"

REQUIRED_IDS=$(
  jq -r '.supported_tokens[]' "$JSON_FILE" \
  | sed 's/^/--required-application-ids /' \
  | tr '\n' ' '
)

# shellcheck disable=SC2086
linera publish-and-create \
  target/wasm32-unknown-unknown/release/auction-contract.wasm \
  target/wasm32-unknown-unknown/release/auction-service.wasm \
  --json-parameters-path "$JSON_FILE" \
  $REQUIRED_IDS
