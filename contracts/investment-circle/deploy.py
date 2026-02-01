#!/usr/bin/env python3
"""
Investment Circle - Deployment Script
Deploys the smart contract to MultiversX Devnet with options:
- upgradeable: true
- payable: true (can receive EGLD for collateral)
- payable-by-sc: true
"""

import subprocess
import sys
import json
import os
from pathlib import Path

# Configuration
PROXY = "https://devnet-gateway.multiversx.com"
CHAIN_ID = "D"
GAS_LIMIT = 100000000

def run_command(cmd, capture=False):
    """Execute a shell command"""
    print(f"$ {cmd}")
    if capture:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result
    else:
        return subprocess.run(cmd, shell=True)

def build_contract():
    """Compile the smart contract"""
    print("\n" + "="*50)
    print("STEP 1: Building the smart contract")
    print("="*50 + "\n")

    meta_dir = Path(__file__).parent / "meta"
    original_dir = os.getcwd()
    os.chdir(meta_dir)

    result = run_command("cargo run --release")
    if result.returncode != 0:
        print("ERROR: Build failed!")
        sys.exit(1)

    os.chdir(original_dir)

    wasm_path = Path(__file__).parent / "output" / "investment-circle.wasm"
    if not wasm_path.exists():
        print(f"ERROR: WASM file not found: {wasm_path}")
        sys.exit(1)

    print(f"\nBuild successful: {wasm_path}")
    return wasm_path

def deploy_contract(wasm_path, pem_path):
    """Deploy the smart contract"""
    print("\n" + "="*50)
    print("STEP 2: Deploying the smart contract")
    print("="*50 + "\n")

    cmd = f"""mxpy contract deploy \
        --bytecode "{wasm_path}" \
        --pem "{pem_path}" \
        --gas-limit {GAS_LIMIT} \
        --proxy {PROXY} \
        --chain {CHAIN_ID} \
        --metadata-payable \
        --metadata-payable-by-sc \
        --recall-nonce \
        --send"""

    result = run_command(cmd, capture=True)

    if result.returncode != 0:
        print(f"ERROR during deployment:\n{result.stderr}")
        sys.exit(1)

    # Extract contract address
    output = result.stdout + result.stderr
    print(output)

    # Look for contract address in output
    contract_address = None
    for line in output.split('\n'):
        if 'contract address' in line.lower() or 'erd1qqqqqqqqqqqqq' in line:
            print(f"\n{'='*50}")
            print(f"CONTRACT DEPLOYED: {line}")
            print(f"{'='*50}\n")
            contract_address = line.strip()
            break

    return contract_address

def main():
    print("\n" + "="*50)
    print("  Investment Circle - Deployment")
    print("="*50)

    # Check arguments
    if len(sys.argv) < 2:
        print("\nUsage: python deploy.py <path_to_wallet.pem>")
        print("\nExample:")
        print("  python deploy.py ../../multiversx-wallets/wallet-deployer.pem")
        print("\nContract options that will be applied:")
        print("  - upgradeable: true")
        print("  - payable: true (can receive EGLD)")
        print("  - payable-by-sc: true")
        sys.exit(1)

    pem_path = Path(sys.argv[1])
    if not pem_path.exists():
        print(f"ERROR: PEM file not found: {pem_path}")
        sys.exit(1)

    # Build
    wasm_path = build_contract()

    # Deploy
    contract_address = deploy_contract(wasm_path, pem_path)

    if contract_address:
        # Save deployment info
        deploy_info = {
            "address": contract_address,
            "network": "devnet",
            "wasm": str(wasm_path),
            "options": {
                "upgradeable": True,
                "payable": True,
                "payable_by_sc": True
            }
        }

        output_file = Path(__file__).parent / "deploy-output.json"
        with open(output_file, 'w') as f:
            json.dump(deploy_info, f, indent=2)

        print(f"\nDeployment info saved to: {output_file}")
        print("\nDon't forget to update the contract address in:")
        print("  frontend/src/config/index.ts")

if __name__ == "__main__":
    main()
