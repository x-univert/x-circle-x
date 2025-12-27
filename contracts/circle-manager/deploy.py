#!/usr/bin/env python3
"""
xCircle DAO - CircleManager Deployment Script
Deploie le smart contract sur MultiversX Devnet avec les options:
- upgradeable: true
- payable: true
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
    """Execute une commande shell"""
    print(f"$ {cmd}")
    if capture:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result
    else:
        return subprocess.run(cmd, shell=True)

def build_contract():
    """Compile le smart contract"""
    print("\n" + "="*50)
    print("ETAPE 1: Compilation du smart contract")
    print("="*50 + "\n")

    meta_dir = Path(__file__).parent / "meta"
    os.chdir(meta_dir)

    result = run_command("cargo run --release")
    if result.returncode != 0:
        print("ERREUR: La compilation a echoue!")
        sys.exit(1)

    os.chdir(Path(__file__).parent)

    wasm_path = Path(__file__).parent / "output" / "circle-manager.wasm"
    if not wasm_path.exists():
        print(f"ERREUR: Fichier WASM non trouve: {wasm_path}")
        sys.exit(1)

    print(f"\nCompilation reussie: {wasm_path}")
    return wasm_path

def deploy_contract(wasm_path, pem_path):
    """Deploie le smart contract"""
    print("\n" + "="*50)
    print("ETAPE 2: Deploiement du smart contract")
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
        print(f"ERREUR lors du deploiement:\n{result.stderr}")
        sys.exit(1)

    # Extraire l'adresse du contrat
    output = result.stdout + result.stderr
    print(output)

    # Chercher l'adresse du contrat dans l'output
    for line in output.split('\n'):
        if 'contract address' in line.lower() or 'erd1qqqqqqqqqqqqq' in line:
            print(f"\n{'='*50}")
            print(f"CONTRAT DEPLOYE: {line}")
            print(f"{'='*50}\n")
            return line

    return None

def main():
    print("\n" + "="*50)
    print("  xCircle DAO - CircleManager Deployment")
    print("="*50)

    # Verifier les arguments
    if len(sys.argv) < 2:
        print("\nUsage: python deploy.py <chemin_vers_wallet.pem>")
        print("\nExemple:")
        print("  python deploy.py ../wallets/owner.pem")
        print("\nOptions du contrat qui seront appliquees:")
        print("  - upgradeable: true")
        print("  - payable: true (peut recevoir EGLD)")
        print("  - payable-by-sc: true")
        sys.exit(1)

    pem_path = Path(sys.argv[1])
    if not pem_path.exists():
        print(f"ERREUR: Fichier PEM non trouve: {pem_path}")
        sys.exit(1)

    # Build
    wasm_path = build_contract()

    # Deploy
    contract_address = deploy_contract(wasm_path, pem_path)

    if contract_address:
        # Sauvegarder l'adresse
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

        print(f"\nInformations sauvegardees dans: {output_file}")
        print("\nN'oubliez pas de mettre a jour l'adresse du contrat dans:")
        print("  frontend/src/config/contracts.ts")

if __name__ == "__main__":
    main()
