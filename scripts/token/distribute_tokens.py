#!/usr/bin/env python3
"""
XCIRCLEX Token Distribution Script
===================================
Distribute XCIRCLEX tokens to allocated addresses after SC deployment.

Usage:
    python distribute_tokens.py --token XCIRCLEX-abc123 --network devnet

Author: X-CIRCLE-X DAO
"""

import argparse
import json
import subprocess
import sys
from decimal import Decimal, getcontext
from pathlib import Path

# Set high precision
getcontext().prec = 50

# =============================================================================
# CONFIGURATION
# =============================================================================

PI = Decimal("3.141592653589793238462643383279502884197")
MULTIPLIER = Decimal("100000000")
TOKEN_DECIMALS = 18
TOTAL_SUPPLY_DISPLAY = PI * MULTIPLIER
TOTAL_SUPPLY_RAW = int(TOTAL_SUPPLY_DISPLAY * Decimal(10 ** TOKEN_DECIMALS))

NETWORKS = {
    "devnet": {
        "proxy": "https://devnet-gateway.multiversx.com",
        "chain_id": "D",
    },
    "testnet": {
        "proxy": "https://testnet-gateway.multiversx.com",
        "chain_id": "T",
    },
    "mainnet": {
        "proxy": "https://gateway.multiversx.com",
        "chain_id": "1",
    }
}

# =============================================================================
# DISTRIBUTION ADDRESSES - UPDATE THESE AFTER DEPLOYING SCs
# =============================================================================

DISTRIBUTION = {
    "circle_of_life_rewards": {
        "percentage": 35,
        "description": "Récompenses Cercle de Vie (SC0)",
        "address": None,  # UPDATE: SC0 address
    },
    "liquidity_pool": {
        "percentage": 20,
        "description": "Pool de Liquidité EGLD/XCIRCLEX",
        "address": None,  # UPDATE: LP or holding address
    },
    "staking_rewards": {
        "percentage": 15,
        "description": "Récompenses Staking 360°",
        "address": None,  # UPDATE: Staking SC address
    },
    "team": {
        "percentage": 10,
        "description": "Équipe fondatrice",
        "address": None,  # UPDATE: Team vesting SC address
    },
    "treasury": {
        "percentage": 10,
        "description": "Trésorerie DAO",
        "address": None,  # UPDATE: Treasury SC address
    },
    "marketing": {
        "percentage": 5,
        "description": "Marketing & Growth",
        "address": None,  # UPDATE: Marketing wallet address
    },
    "advisors": {
        "percentage": 3,
        "description": "Conseillers",
        "address": None,  # UPDATE: Advisors vesting SC address
    },
    "airdrop": {
        "percentage": 2,
        "description": "Airdrop initial",
        "address": None,  # UPDATE: Airdrop SC address
    }
}


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def to_hex(value: str) -> str:
    """Convert string to hex."""
    return value.encode().hex()


def int_to_hex(value: int) -> str:
    """Convert integer to hex."""
    hex_val = hex(value)[2:]
    if len(hex_val) % 2 != 0:
        hex_val = "0" + hex_val
    return hex_val


def calculate_allocation(percentage: float) -> int:
    """Calculate token allocation from percentage."""
    return int(TOTAL_SUPPLY_RAW * Decimal(percentage) / Decimal(100))


def format_amount(raw: int) -> str:
    """Format raw amount to display."""
    return f"{Decimal(raw) / Decimal(10 ** TOKEN_DECIMALS):,.6f}"


# =============================================================================
# DISTRIBUTION FUNCTIONS
# =============================================================================

def load_addresses(config_file: Path) -> dict:
    """Load distribution addresses from config file."""
    if config_file.exists():
        with open(config_file, 'r') as f:
            config = json.load(f)
            return config.get("addresses", {})
    return {}


def save_addresses(config_file: Path, addresses: dict):
    """Save distribution addresses to config file."""
    config = {"addresses": addresses}
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)


def generate_transfer_command(
    token_identifier: str,
    recipient: str,
    amount_raw: int,
    pem_path: str,
    network: str
) -> str:
    """Generate mxpy command for ESDT transfer."""

    net_config = NETWORKS[network]
    token_hex = to_hex(token_identifier)
    amount_hex = int_to_hex(amount_raw)

    data = f"ESDTTransfer@{token_hex}@{amount_hex}"

    command = f"""mxpy tx new \\
    --receiver {recipient} \\
    --value 0 \\
    --gas-limit 500000 \\
    --data "{data}" \\
    --pem="{pem_path}" \\
    --chain={net_config['chain_id']} \\
    --proxy={net_config['proxy']} \\
    --recall-nonce \\
    --send"""

    return command


def execute_transfer(
    token_identifier: str,
    recipient: str,
    amount_raw: int,
    pem_path: str,
    network: str,
    dry_run: bool = True
) -> bool:
    """Execute ESDT transfer."""

    net_config = NETWORKS[network]
    token_hex = to_hex(token_identifier)
    amount_hex = int_to_hex(amount_raw)

    data = f"ESDTTransfer@{token_hex}@{amount_hex}"

    cmd = [
        "mxpy", "tx", "new",
        "--receiver", recipient,
        "--value", "0",
        "--gas-limit", "500000",
        "--data", data,
        "--pem", pem_path,
        "--chain", net_config['chain_id'],
        "--proxy", net_config['proxy'],
        "--recall-nonce",
        "--send"
    ]

    if dry_run:
        print(f"  [DRY RUN] Would execute: {' '.join(cmd[:8])}...")
        return True

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  [SUCCESS] Transaction sent!")
            return True
        else:
            print(f"  [ERROR] {result.stderr}")
            return False
    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        return False


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Distribute XCIRCLEX tokens")
    parser.add_argument("--token", required=True, help="Token identifier (e.g., XCIRCLEX-abc123)")
    parser.add_argument("--network", default="devnet", choices=["devnet", "testnet", "mainnet"])
    parser.add_argument("--pem", default="../../multiversx-wallets/deployer.pem", help="Path to PEM file")
    parser.add_argument("--config", default="distribution_addresses.json", help="Config file with addresses")
    parser.add_argument("--execute", action="store_true", help="Actually execute transfers (default is dry run)")
    args = parser.parse_args()

    print("""
╔═══════════════════════════════════════════════════════════════════════╗
║                  XCIRCLEX TOKEN DISTRIBUTION                          ║
╚═══════════════════════════════════════════════════════════════════════╝
    """)

    print(f"Token: {args.token}")
    print(f"Network: {args.network.upper()}")
    print(f"PEM: {args.pem}")
    print(f"Mode: {'EXECUTE' if args.execute else 'DRY RUN'}")
    print()

    # Load addresses from config
    config_file = Path(__file__).parent / args.config
    saved_addresses = load_addresses(config_file)

    # Update DISTRIBUTION with saved addresses
    for key in DISTRIBUTION:
        if key in saved_addresses:
            DISTRIBUTION[key]["address"] = saved_addresses[key]

    # Display distribution plan
    print("=" * 70)
    print("DISTRIBUTION PLAN")
    print("=" * 70)
    print()

    ready_count = 0
    for key, alloc in DISTRIBUTION.items():
        amount_raw = calculate_allocation(alloc["percentage"])
        amount_display = format_amount(amount_raw)
        status = "✅" if alloc["address"] else "❌"

        if alloc["address"]:
            ready_count += 1

        print(f"{status} {alloc['description']}")
        print(f"   Amount: {amount_display} XCIRCLEX ({alloc['percentage']}%)")
        print(f"   Address: {alloc['address'] or 'NOT SET'}")
        print()

    print("=" * 70)
    print(f"Ready: {ready_count}/{len(DISTRIBUTION)} allocations")
    print("=" * 70)
    print()

    if ready_count == 0:
        print("No addresses configured. Please update the distribution_addresses.json file:")
        print()

        # Create template
        template = {key: None for key in DISTRIBUTION}
        save_addresses(config_file, template)
        print(f"Template created at: {config_file}")
        print()
        print("Example format:")
        print(json.dumps({
            "addresses": {
                "circle_of_life_rewards": "erd1qqqqqqqqqqqqqpgq...",
                "staking_rewards": "erd1qqqqqqqqqqqqqpgq...",
                "treasury": "erd1qqqqqqqqqqqqqpgq...",
            }
        }, indent=2))
        return

    if not args.execute:
        print("This is a DRY RUN. Add --execute to actually send transactions.")
        print()

    # Confirm before executing
    if args.execute:
        confirm = input("Are you sure you want to distribute tokens? (yes/no): ")
        if confirm.lower() != "yes":
            print("Aborted.")
            return

    # Execute transfers
    print()
    print("=" * 70)
    print("EXECUTING TRANSFERS")
    print("=" * 70)
    print()

    success_count = 0
    for key, alloc in DISTRIBUTION.items():
        if not alloc["address"]:
            print(f"⏭️ Skipping {alloc['description']} (no address)")
            continue

        amount_raw = calculate_allocation(alloc["percentage"])
        print(f"📤 {alloc['description']}")
        print(f"   To: {alloc['address']}")
        print(f"   Amount: {format_amount(amount_raw)} XCIRCLEX")

        success = execute_transfer(
            args.token,
            alloc["address"],
            amount_raw,
            args.pem,
            args.network,
            dry_run=not args.execute
        )

        if success:
            success_count += 1
        print()

    print("=" * 70)
    print(f"COMPLETED: {success_count}/{ready_count} transfers")
    print("=" * 70)


if __name__ == "__main__":
    main()
