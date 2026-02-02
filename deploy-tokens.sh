#!/usr/bin/env sh
set -eu

JSON_FILE="test-tokens.json"
TOKEN_RESULTS=""

# Get the number of tokens in the JSON file
TOKEN_COUNT=$(jq 'length' "$JSON_FILE")

echo "Deploying $TOKEN_COUNT tokens..."
echo ""

# Loop through each token
i=0
while [ "$i" -lt "$TOKEN_COUNT" ]; do
  NAME=$(jq -r ".[$i].name" "$JSON_FILE")
  SYMBOL=$(jq -r ".[$i].symbol" "$JSON_FILE")

  echo "Deploying token: $NAME ($SYMBOL)"

  # Deploy the token and capture the last line (tokenId)
  TOKEN_ID=$(linera publish-and-create \
    target/wasm32-unknown-unknown/release/fungible-contract.wasm \
    target/wasm32-unknown-unknown/release/fungible-service.wasm \
    --json-parameters "{\"name\": \"$NAME\", \"symbol\": \"$SYMBOL\"}" \
    | tail -n 1)

  echo "  Token ID: $TOKEN_ID"
  echo ""

  # Append to TOKEN_RESULTS (symbol:tokenId format, newline-separated)
  if [ -z "$TOKEN_RESULTS" ]; then
    TOKEN_RESULTS="$SYMBOL:$TOKEN_ID"
  else
    TOKEN_RESULTS="$TOKEN_RESULTS
$SYMBOL:$TOKEN_ID"
  fi

  i=$((i + 1))
done

echo "========================================"
echo "All tokens deployed successfully!"
echo "========================================"
echo ""
echo "Token IDs:"
echo "$TOKEN_RESULTS" | while IFS=: read -r symbol token_id; do
  printf "  %-8s %s\n" "$symbol" "$token_id"
done
echo ""
echo "As JSON object:"
echo "$TOKEN_RESULTS" | jq -R -s '
  split("\n")
  | map(select(length > 0))
  | map(split(":") | {(.[0]): .[1]})
  | add'
