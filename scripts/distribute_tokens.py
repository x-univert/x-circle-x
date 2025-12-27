#!/usr/bin/env python3
"""
Distribute XCIRCLEX tokens to contracts
"""
import subprocess
import sys
from pathlib import Path
from decimal import Decimal, getcontext

# Set high precision for Pi calculations
getcontext().prec = 50

# Configuration
TOKEN_ID = "XCIRCLEX-3b9d57"
DECIMALS = 18
NETWORK = "devnet"
PEM_PATH = Path(__file__).parent.parent / "multiversx-wallets" / "wallet-test-devnet.pem"

PROXY = "https://devnet-gateway.multiversx.com"
CHAIN_ID = "D"

# Contracts (deployed with wallet-deployer.pem + metadata-payable + str:XCIRCLEX-3b9d57)
STAKING_CONTRACT = "erd1qqqqqqqqqqqqqpgqd5r76rsws9kvzcdsxqqgjlrjlw90x44uflfq386xhw"
VESTING_CONTRACT = "erd1qqqqqqqqqqqqqpgqc00rmsjfsk6prqwpcjggxzmdeus0vwa0flfqhxgel0"

# Total supply: PI * 10^8 = 314,159,265.358979323846264338
PI_TOTAL = Decimal("314159265.358979323846264338")

# Distribution:
# Staking Rewards: 15% -> 47,123,889.803846989476939650
# Team (10%) + Marketing (5%) + Advisors (3%) = 18% -> 56,548,667.764616078092327581
# (These go to vesting contract)

STAKING_PERCENTAGE = Decimal("0.15")
VESTING_PERCENTAGE = Decimal("0.18")  # Team 10% + Marketing 5% + Advisors 3%

def calculate_amount(percentage: Decimal) -> int:
    """Calculate token amount in smallest units (with 18 decimals)."""
    amount = PI_TOTAL * percentage * Decimal(10**DECIMALS)
    return int(amount)

def to_hex(value: str) -> str:
    """Convert string to hex."""
    return value.encode().hex()

def int_to_hex(value: int) -> str:
    """Convert integer to hex (minimum 2 chars, even length)."""
    hex_val = hex(value)[2:]  # Remove '0x' prefix
    if len(hex_val) % 2 == 1:
        hex_val = '0' + hex_val
    return hex_val

def send_tokens(receiver: str, amount: int, description: str, endpoint: str):
    """Send ESDT tokens to a contract via payable endpoint."""
    print(f"\n{'='*60}")
    print(f"Sending tokens: {description}")
    print(f"  Receiver: {receiver}")
    print(f"  Endpoint: {endpoint}")
    print(f"  Amount: {amount / 10**DECIMALS:,.18f} XCIRCLEX")
    print(f"  Raw amount: {amount}")

    # Construct the transfer with endpoint call
    # ESDTTransfer@token_id@amount@endpoint
    token_hex = to_hex(TOKEN_ID)
    amount_hex = int_to_hex(amount)
    endpoint_hex = to_hex(endpoint)

    data = f"ESDTTransfer@{token_hex}@{amount_hex}@{endpoint_hex}"
    print(f"  Data: {data[:100]}...")

    cmd = [
        sys.executable, "-m", "multiversx_sdk_cli.cli",
        "tx", "new",
        "--receiver", receiver,
        "--pem", str(PEM_PATH),
        "--gas-limit", "10000000",  # Higher gas for SC calls
        "--data", data,
        "--proxy", PROXY,
        "--chain", CHAIN_ID,
        "--recall-nonce",
        "--send"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)

    return result.returncode == 0

def main():
    if not PEM_PATH.exists():
        print(f"PEM file not found: {PEM_PATH}")
        sys.exit(1)

    print("="*60)
    print("XCIRCLEX Token Distribution")
    print("="*60)
    print(f"Token: {TOKEN_ID}")
    print(f"Total Supply: {PI_TOTAL:,.18f}")

    # Calculate amounts
    staking_amount = calculate_amount(STAKING_PERCENTAGE)
    vesting_amount = calculate_amount(VESTING_PERCENTAGE)

    print(f"\nDistribution Plan:")
    print(f"  Staking (15%): {staking_amount / 10**DECIMALS:,.18f}")
    print(f"  Vesting (18%): {vesting_amount / 10**DECIMALS:,.18f}")

    # Send to staking contract via addRewards endpoint
    success1 = send_tokens(
        STAKING_CONTRACT,
        staking_amount,
        "Staking Rewards (15%)",
        "addRewards"
    )

    # Send to vesting contract via depositTokens endpoint
    success2 = send_tokens(
        VESTING_CONTRACT,
        vesting_amount,
        "Vesting Allocation (18% - Team/Marketing/Advisors)",
        "depositTokens"
    )

    print("\n" + "="*60)
    print("Distribution Results:")
    print(f"  Staking: {'SUCCESS' if success1 else 'FAILED'}")
    print(f"  Vesting: {'SUCCESS' if success2 else 'FAILED'}")
    print("="*60)

    return 0 if (success1 and success2) else 1

if __name__ == "__main__":
    sys.exit(main())
