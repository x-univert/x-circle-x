#!/bin/bash
export PATH=$HOME/.cargo/bin:$PATH
cd /mnt/c/Users/DEEPGAMING/MultiversX/X-CIRCLE-X/contracts/test-adder
sc-meta all build

# Optimization avec wasm-opt (optionnel)
if command -v wasm-opt &> /dev/null; then
    echo "Optimizing with wasm-opt..."
    wasm-opt -Oz --enable-bulk-memory --enable-sign-ext --enable-mutable-globals \
        output/test-adder.wasm -o output/test-adder-optimized.wasm
    echo "Optimized WASM created: output/test-adder-optimized.wasm"
else
    echo "Warning: wasm-opt not found, skipping optimization"
fi
