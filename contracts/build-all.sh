#!/bin/bash

# Script de build pour tous les smart contracts X-CIRCLE-X
# Version: 0.62.0

export PATH=$HOME/.cargo/bin:$PATH

echo "=================================="
echo "  X-CIRCLE-X - Build All Contracts"
echo "=================================="
echo ""

# Couleurs pour le terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Liste des contrats à compiler
CONTRACTS=("circle-manager" "test-adder")

# Compteurs
SUCCESS=0
FAILED=0

# Fonction pour compiler un contract
build_contract() {
    local CONTRACT=$1
    local CONTRACT_PATH="/mnt/c/Users/DEEPGAMING/MultiversX/X-CIRCLE-X/contracts/$CONTRACT"

    echo "📦 Building: $CONTRACT"
    echo "   Path: $CONTRACT_PATH"

    if [ ! -d "$CONTRACT_PATH" ]; then
        echo -e "${RED}   ❌ Contract directory not found${NC}"
        ((FAILED++))
        return 1
    fi

    cd "$CONTRACT_PATH" || return 1

    # Build avec sc-meta
    if sc-meta all build > /dev/null 2>&1; then
        # Récupérer la taille du WASM
        if [ -f "output/$CONTRACT.wasm" ]; then
            SIZE=$(ls -lh "output/$CONTRACT.wasm" | awk '{print $5}')
            echo -e "${GREEN}   ✅ Success - WASM size: $SIZE${NC}"
            ((SUCCESS++))
        else
            echo -e "${RED}   ❌ WASM file not generated${NC}"
            ((FAILED++))
        fi
    else
        echo -e "${RED}   ❌ Build failed${NC}"
        ((FAILED++))
        return 1
    fi

    echo ""
}

# Build de tous les contrats
for CONTRACT in "${CONTRACTS[@]}"; do
    build_contract "$CONTRACT"
done

# Résumé
echo "=================================="
echo "  Build Summary"
echo "=================================="
echo -e "✅ Success: ${GREEN}$SUCCESS${NC}"
echo -e "❌ Failed:  ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All contracts built successfully!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some contracts failed to build${NC}"
    exit 1
fi
