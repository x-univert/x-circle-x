#!/usr/bin/env python3
"""
Deploy Staking Contract using mxpy Python bindings
"""
import subprocess
import sys
from pathlib import Path

# Configuration
TOKEN_ID = "XCIRCLEX-3b9d57"
NETWORK = "devnet"
PEM_PATH = Path(__file__).parent.parent / "multiversx-wallets" / "wallet-test-devnet.pem"
WASM_PATH = Path(__file__).parent.parent / "contracts" / "xcirclex-staking" / "output" / "xcirclex-staking.wasm"

PROXY = "https://devnet-gateway.multiversx.com"
CHAIN_ID = "D"

def to_hex(value: str) -> str:
    """Convert string to hex."""
    return value.encode().hex()

def main():
    if not WASM_PATH.exists():
        print(f"WASM file not found: {WASM_PATH}")
        sys.exit(1)

    if not PEM_PATH.exists():
        print(f"PEM file not found: {PEM_PATH}")
        sys.exit(1)

    print(f"Deploying Staking Contract...")
    print(f"  WASM: {WASM_PATH}")
    print(f"  Size: {WASM_PATH.stat().st_size} bytes")
    print(f"  Token: {TOKEN_ID}")

    # Token hex
    token_hex = to_hex(TOKEN_ID)
    print(f"  Token Hex: {token_hex}")

    # Deploy using mxpy
    cmd = [
        sys.executable, "-m", "multiversx_sdk_cli.cli",
        "contract", "deploy",
        "--bytecode", str(WASM_PATH),
        "--pem", str(PEM_PATH),
        "--gas-limit", "100000000",
        "--arguments", f"0x{token_hex}",
        "--proxy", PROXY,
        "--chain", CHAIN_ID,
        "--recall-nonce",
        "--send"
    ]

    print(f"\nRunning: {' '.join(cmd[:10])}...")

    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)

    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
