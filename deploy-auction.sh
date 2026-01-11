#!/usr/bin/env sh
set -eu

JSON_FILE="json-parameter.json"

REQUIRED_ARGS=""

# Read tokens line-by-line safely
jq -r '.supported_tokens[]' "$JSON_FILE" | while IFS= read -r token; do
  REQUIRED_ARGS="$REQUIRED_ARGS --required-application-ids $token"
done

# shellcheck disable=SC2086
linera publish-and-create \
  target/wasm32-unknown-unknown/release/auction-contract.wasm \
  target/wasm32-unknown-unknown/release/auction-service.wasm \
  --json-parameters-path "$JSON_FILE" \
  $REQUIRED_ARGS
