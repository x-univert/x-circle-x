#!/bin/bash
export PATH=$HOME/.cargo/bin:$PATH
cd /mnt/c/Users/DEEPGAMING/MultiversX/X-CIRCLE-X/contracts/circle-manager
sc-meta all build

# Optimization avec wasm-opt (optionnel)
if command -v wasm-opt &> /dev/null; then
    echo "Optimizing with wasm-opt..."
    wasm-opt -Oz --enable-bulk-memory --enable-sign-ext --enable-mutable-globals \
        output/circle-manager.wasm -o output/circle-manager-optimized.wasm
    echo "Optimized WASM created: output/circle-manager-optimized.wasm"
else
    echo "Warning: wasm-opt not found, skipping optimization"
fi
