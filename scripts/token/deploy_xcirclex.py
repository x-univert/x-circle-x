#!/usr/bin/env python3
"""
XCIRCLEX Token Deployment Script
================================
Deploy the XCIRCLEX token on MultiversX with Pi-based supply.

Supply: π × 10^8 = 314,159,265.358979323846264338 XCIRCLEX
Decimals: 18

Author: X-CIRCLE-X DAO
"""

import os
import sys
import json
import time
from pathlib import Path
from decimal import Decimal, getcontext

# Set high precision for Pi calculations
getcontext().prec = 50

# =============================================================================
# CONFIGURATION
# =============================================================================

# Pi with 18 decimals after the multiplication
PI = Decimal("3.141592653589793238462643383279502884197")
MULTIPLIER = Decimal("100000000")  # 10^8
TOKEN_DECIMALS = 18

# Calculate exact supply
TOTAL_SUPPLY_DISPLAY = PI * MULTIPLIER  # 314,159,265.358979323846264338
TOTAL_SUPPLY_RAW = int(TOTAL_SUPPLY_DISPLAY * Decimal(10 ** TOKEN_DECIMALS))

# Token metadata
TOKEN_NAME = "XCIRCLEX"
TOKEN_TICKER = "XCIRCLEX"

# Network configuration
NETWORKS = {
    "devnet": {
        "proxy": "https://devnet-gateway.multiversx.com",
        "chain_id": "D",
        "explorer": "https://devnet-explorer.multiversx.com"
    },
    "testnet": {
        "proxy": "https://testnet-gateway.multiversx.com",
        "chain_id": "T",
        "explorer": "https://testnet-explorer.multiversx.com"
    },
    "mainnet": {
        "proxy": "https://gateway.multiversx.com",
        "chain_id": "1",
        "explorer": "https://explorer.multiversx.com"
    }
}

# ESDT System SC address
ESDT_SYSTEM_SC = "erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"

# Issue cost (0.05 EGLD)
ISSUE_COST = 50000000000000000  # 0.05 EGLD in smallest unit

# Distribution allocations (percentages)
DISTRIBUTION = {
    "circle_of_life_rewards": {
        "percentage": 35,
        "description": "Récompenses Cercle de Vie (SC0)",
        "vesting": "4 ans progressif",
        "address": None  # Will be set to SC0 address
    },
    "liquidity_pool": {
        "percentage": 20,
        "description": "Pool de Liquidité EGLD/XCIRCLEX",
        "vesting": "Immédiat",
        "address": None  # Will be set to xExchange LP
    },
    "staking_rewards": {
        "percentage": 15,
        "description": "Récompenses Staking 360°",
        "vesting": "Distribution sur durée de vie",
        "address": None  # Will be set to Staking SC
    },
    "team": {
        "percentage": 10,
        "description": "Équipe fondatrice",
        "vesting": "24 mois (cliff 6 mois)",
        "address": None  # Will be set to Vesting SC
    },
    "treasury": {
        "percentage": 10,
        "description": "Trésorerie DAO",
        "vesting": "Contrôlé par gouvernance",
        "address": None  # Will be set to Treasury SC
    },
    "marketing": {
        "percentage": 5,
        "description": "Marketing & Growth",
        "vesting": "12 mois",
        "address": None  # Will be set to Marketing wallet
    },
    "advisors": {
        "percentage": 3,
        "description": "Conseillers",
        "vesting": "12 mois (cliff 3 mois)",
        "address": None  # Will be set to Vesting SC
    },
    "airdrop": {
        "percentage": 2,
        "description": "Airdrop initial",
        "vesting": "Immédiat",
        "address": None  # Will be set to Airdrop SC
    }
}


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def to_hex(value: str) -> str:
    """Convert string to hex."""
    return value.encode().hex()


def int_to_hex(value: int) -> str:
    """Convert integer to hex (without 0x prefix)."""
    hex_val = hex(value)[2:]
    # Ensure even length
    if len(hex_val) % 2 != 0:
        hex_val = "0" + hex_val
    return hex_val


def format_token_amount(raw_amount: int, decimals: int = 18) -> str:
    """Format raw token amount to human readable."""
    display = Decimal(raw_amount) / Decimal(10 ** decimals)
    return f"{display:,.18f}"


def calculate_allocation(percentage: float) -> int:
    """Calculate token allocation from percentage."""
    return int(TOTAL_SUPPLY_RAW * Decimal(percentage) / Decimal(100))


# =============================================================================
# TOKEN ISSUANCE
# =============================================================================

def generate_issue_data() -> str:
    """Generate the data field for token issuance transaction."""

    # Function: issue
    # Parameters:
    # - token name (hex)
    # - token ticker (hex)
    # - initial supply (hex)
    # - num decimals (hex)
    # - properties (key-value pairs in hex)

    parts = [
        "issue",
        to_hex(TOKEN_NAME),
        to_hex(TOKEN_TICKER),
        int_to_hex(TOTAL_SUPPLY_RAW),
        int_to_hex(TOKEN_DECIMALS),
        # Properties
        to_hex("canFreeze"), to_hex("true"),
        to_hex("canWipe"), to_hex("true"),
        to_hex("canPause"), to_hex("true"),
        to_hex("canMint"), to_hex("false"),  # No minting after creation
        to_hex("canBurn"), to_hex("true"),   # Can burn tokens
        to_hex("canChangeOwner"), to_hex("true"),
        to_hex("canUpgrade"), to_hex("true"),
        to_hex("canAddSpecialRoles"), to_hex("true"),
    ]

    return "@".join(parts)


def generate_issue_command(pem_path: str, network: str = "devnet") -> str:
    """Generate mxpy command for token issuance."""

    net_config = NETWORKS[network]
    data = generate_issue_data()

    command = f"""mxpy tx new \\
    --receiver {ESDT_SYSTEM_SC} \\
    --value {ISSUE_COST} \\
    --gas-limit 60000000 \\
    --data "{data}" \\
    --pem="{pem_path}" \\
    --chain={net_config['chain_id']} \\
    --proxy={net_config['proxy']} \\
    --recall-nonce \\
    --send"""

    return command


# =============================================================================
# DISTRIBUTION
# =============================================================================

def generate_distribution_report() -> str:
    """Generate a report of token distribution."""

    report = []
    report.append("=" * 70)
    report.append("XCIRCLEX TOKEN DISTRIBUTION REPORT")
    report.append("=" * 70)
    report.append("")
    report.append(f"Token Name: {TOKEN_NAME}")
    report.append(f"Token Ticker: {TOKEN_TICKER}")
    report.append(f"Decimals: {TOKEN_DECIMALS}")
    report.append(f"Total Supply (display): {format_token_amount(TOTAL_SUPPLY_RAW)}")
    report.append(f"Total Supply (raw): {TOTAL_SUPPLY_RAW}")
    report.append("")
    report.append("Based on Pi (π):")
    report.append(f"  π = {PI}")
    report.append(f"  π × 10^8 = {TOTAL_SUPPLY_DISPLAY}")
    report.append("")
    report.append("-" * 70)
    report.append("ALLOCATIONS:")
    report.append("-" * 70)
    report.append("")

    total_check = 0
    for key, alloc in DISTRIBUTION.items():
        amount_raw = calculate_allocation(alloc["percentage"])
        amount_display = format_token_amount(amount_raw)
        total_check += alloc["percentage"]

        report.append(f"  {alloc['description']}")
        report.append(f"    Percentage: {alloc['percentage']}%")
        report.append(f"    Amount: {amount_display} XCIRCLEX")
        report.append(f"    Raw: {amount_raw}")
        report.append(f"    Vesting: {alloc['vesting']}")
        report.append(f"    Address: {alloc['address'] or 'TO BE DEFINED'}")
        report.append("")

    report.append("-" * 70)
    report.append(f"TOTAL: {total_check}%")
    report.append("-" * 70)

    return "\n".join(report)


def generate_distribution_commands(token_identifier: str, pem_path: str, network: str = "devnet") -> list:
    """Generate mxpy commands for distributing tokens to allocations."""

    net_config = NETWORKS[network]
    commands = []

    for key, alloc in DISTRIBUTION.items():
        if alloc["address"] is None:
            continue

        amount_raw = calculate_allocation(alloc["percentage"])
        amount_hex = int_to_hex(amount_raw)
        token_hex = to_hex(token_identifier)

        # ESDTTransfer@<token>@<amount>
        data = f"ESDTTransfer@{token_hex}@{amount_hex}"

        command = f"""# {alloc['description']} ({alloc['percentage']}%)
mxpy tx new \\
    --receiver {alloc['address']} \\
    --value 0 \\
    --gas-limit 500000 \\
    --data "{data}" \\
    --pem="{pem_path}" \\
    --chain={net_config['chain_id']} \\
    --proxy={net_config['proxy']} \\
    --recall-nonce \\
    --send
"""
        commands.append(command)

    return commands


# =============================================================================
# MAIN SCRIPT
# =============================================================================

def main():
    print("""
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║     ██╗  ██╗ ██████╗██╗██████╗  ██████╗██╗     ███████╗██╗  ██╗      ║
║     ╚██╗██╔╝██╔════╝██║██╔══██╗██╔════╝██║     ██╔════╝╚██╗██╔╝      ║
║      ╚███╔╝ ██║     ██║██████╔╝██║     ██║     █████╗   ╚███╔╝       ║
║      ██╔██╗ ██║     ██║██╔══██╗██║     ██║     ██╔══╝   ██╔██╗       ║
║     ██╔╝ ██╗╚██████╗██║██║  ██║╚██████╗███████╗███████╗██╔╝ ██╗      ║
║     ╚═╝  ╚═╝ ╚═════╝╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝      ║
║                                                                       ║
║                    TOKEN DEPLOYMENT SCRIPT                            ║
║                    π × 10^8 = 314,159,265 XCIRCLEX                    ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
    """)

    # Print distribution report
    print(generate_distribution_report())
    print()

    # Ask for network
    print("Select network:")
    print("  1. Devnet (recommended for testing)")
    print("  2. Testnet")
    print("  3. Mainnet (CAUTION!)")
    print()

    choice = input("Enter choice (1/2/3): ").strip()
    network_map = {"1": "devnet", "2": "testnet", "3": "mainnet"}
    network = network_map.get(choice, "devnet")

    print(f"\nSelected network: {network.upper()}")

    # Ask for PEM file path
    default_pem = "../../multiversx-wallets/deployer.pem"
    pem_path = input(f"Enter PEM file path [{default_pem}]: ").strip()
    if not pem_path:
        pem_path = default_pem

    # Generate issue command
    print("\n" + "=" * 70)
    print("STEP 1: ISSUE TOKEN")
    print("=" * 70)
    print("\nRun this command to issue the XCIRCLEX token:\n")
    print(generate_issue_command(pem_path, network))

    print("\n" + "=" * 70)
    print("STEP 2: SAVE TOKEN IDENTIFIER")
    print("=" * 70)
    print("""
After the transaction is confirmed, find the token identifier in the
transaction logs. It will look like: XCIRCLEX-abc123

Save this identifier for the distribution step.
""")

    print("=" * 70)
    print("STEP 3: SET SPECIAL ROLES (Optional)")
    print("=" * 70)
    print("""
If you need to set special roles (like ESDTRoleLocalBurn for SC0):

mxpy tx new \\
    --receiver erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u \\
    --value 0 \\
    --gas-limit 60000000 \\
    --data "setSpecialRole@<TOKEN_HEX>@<SC_ADDRESS_HEX>@<ROLE_HEX>" \\
    --pem="{pem_path}" \\
    --chain={network} \\
    --proxy={NETWORKS[network]['proxy']} \\
    --recall-nonce \\
    --send

Roles disponibles:
- ESDTRoleLocalMint
- ESDTRoleLocalBurn
- ESDTTransferRole
""".format(pem_path=pem_path, network=NETWORKS[network]['chain_id']))

    # Save configuration
    config = {
        "token_name": TOKEN_NAME,
        "token_ticker": TOKEN_TICKER,
        "decimals": TOKEN_DECIMALS,
        "total_supply_display": str(TOTAL_SUPPLY_DISPLAY),
        "total_supply_raw": str(TOTAL_SUPPLY_RAW),
        "network": network,
        "distribution": {
            key: {
                **alloc,
                "amount_raw": str(calculate_allocation(alloc["percentage"])),
                "amount_display": format_token_amount(calculate_allocation(alloc["percentage"]))
            }
            for key, alloc in DISTRIBUTION.items()
        }
    }

    config_path = Path(__file__).parent / f"xcirclex_config_{network}.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"\nConfiguration saved to: {config_path}")
    print("\n" + "=" * 70)
    print("NEXT STEPS:")
    print("=" * 70)
    print("""
1. Run the issue command above
2. Wait for transaction confirmation
3. Note the token identifier (XCIRCLEX-xxxxxx)
4. Update the distribution addresses in this script
5. Run the distribution commands
6. Deploy SC0 (Circle of Life Center) with the token identifier
7. Set special roles for SC0 (ESDTRoleLocalBurn)
""")


if __name__ == "__main__":
    main()
