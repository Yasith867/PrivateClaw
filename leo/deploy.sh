#!/usr/bin/env bash
# =============================================================
# PrivateClaw — Leo Contract Deployment Script
# =============================================================
# USAGE:
#   1. Copy ../.env.example to ../.env
#   2. Set ALEO_PRIVATE_KEY in ../.env (never commit this file)
#   3. Make sure you have testnet credits: https://faucet.aleo.org
#   4. Run: bash deploy.sh
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# Load .env if it exists
if [ -f "$ENV_FILE" ]; then
  echo "[INFO] Loading environment from .env"
  set -a
  source "$ENV_FILE"
  set +a
fi

# Validate private key is set and not the placeholder
if [ -z "$ALEO_PRIVATE_KEY" ] || [ "$ALEO_PRIVATE_KEY" = "YOUR_PRIVATE_KEY_HERE" ]; then
  echo ""
  echo "==========================================================="
  echo "  ERROR: ALEO_PRIVATE_KEY is not set."
  echo "==========================================================="
  echo ""
  echo "  Steps to fix:"
  echo "  1. Generate a new Aleo account:"
  echo "       leo account new"
  echo "     or visit: https://provable.tools/account"
  echo ""
  echo "  2. Fund it with testnet credits:"
  echo "       https://faucet.aleo.org"
  echo "     (paste your aleo1... address)"
  echo ""
  echo "  3. Add your private key to .env:"
  echo "       ALEO_PRIVATE_KEY=APrivateKey1..."
  echo ""
  echo "  ⚠️  NEVER share your private key or commit .env"
  echo "==========================================================="
  exit 1
fi

echo "[STEP 1] Building Leo contract..."
cd "$SCRIPT_DIR"
leo build

echo ""
echo "[STEP 2] Running local test (place_bet 42field 1field 500000u64)..."
leo run place_bet 42field 1field 500000u64

echo ""
echo "[STEP 3] Deploying private_claw.aleo to Aleo Testnet..."
aleo deploy private_claw.aleo \
  --private-key "$ALEO_PRIVATE_KEY" \
  --query "https://api.provable.com/v2/testnet" \
  --broadcast "https://api.provable.com/v2/testnet/transaction/broadcast"

echo ""
echo "==========================================================="
echo "  Deployment complete!"
echo "  View your program at:"
echo "  https://explorer.aleo.org/program/private_claw.aleo"
echo "==========================================================="
