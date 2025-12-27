#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║     ██╗  ██╗ ██████╗██╗██████╗  ██████╗██╗     ███████╗██╗  ██╗          ║
║     ╚██╗██╔╝██╔════╝██║██╔══██╗██╔════╝██║     ██╔════╝╚██╗██╔╝          ║
║      ╚███╔╝ ██║     ██║██████╔╝██║     ██║     █████╗   ╚███╔╝           ║
║      ██╔██╗ ██║     ██║██╔══██╗██║     ██║     ██╔══╝   ██╔██╗           ║
║     ██╔╝ ██╗╚██████╗██║██║  ██║╚██████╗███████╗███████╗██╔╝ ██╗          ║
║     ╚═╝  ╚═╝ ╚═════╝╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝          ║
║                                                                           ║
║                    COMPLETE DEPLOYMENT SCRIPT                             ║
║                                                                           ║
║  Ce script déploie tout l'écosystème X-CIRCLE-X:                         ║
║  1. Émet le token XCIRCLEX (π × 10^8)                                    ║
║  2. Déploie les smart contracts (Staking, Vesting)                       ║
║  3. Distribue les tokens selon les allocations                           ║
║  4. Configure les rôles ESDT                                             ║
║  5. Crée les schedules de vesting                                        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

Usage:
    python deploy_all.py --network devnet --pem wallet.pem

Author: X-CIRCLE-X DAO
"""

import argparse
import json
import subprocess
import sys
import time
from dataclasses import dataclass
from decimal import Decimal, getcontext
from pathlib import Path
from typing import Optional, List, Dict

# High precision for Pi
getcontext().prec = 50

# =============================================================================
# CONFIGURATION
# =============================================================================

PI = Decimal("3.141592653589793238462643383279502884197")
MULTIPLIER = Decimal("100000000")
TOKEN_DECIMALS = 18
TOTAL_SUPPLY_DISPLAY = PI * MULTIPLIER
TOTAL_SUPPLY_RAW = int(TOTAL_SUPPLY_DISPLAY * Decimal(10 ** TOKEN_DECIMALS))

TOKEN_NAME = "XCIRCLEX"
TOKEN_TICKER = "XCIRCLEX"

ESDT_SYSTEM_SC = "erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"
ISSUE_COST = 50000000000000000  # 0.05 EGLD

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

# Distribution percentages
DISTRIBUTION = {
    "circle_of_life": {"percentage": 35, "name": "Cercle de Vie (SC0)"},
    "liquidity_pool": {"percentage": 20, "name": "Pool Liquidité"},
    "staking_rewards": {"percentage": 15, "name": "Staking Rewards"},
    "team": {"percentage": 10, "name": "Équipe"},
    "treasury": {"percentage": 10, "name": "Trésorerie DAO"},
    "marketing": {"percentage": 5, "name": "Marketing"},
    "advisors": {"percentage": 3, "name": "Conseillers"},
    "airdrop": {"percentage": 2, "name": "Airdrop"},
}

# Team vesting schedules (address, amount percentage of team allocation, name)
TEAM_SCHEDULES = [
    # {"address": "erd1...", "percentage": 50, "name": "Fondateur 1"},
    # {"address": "erd1...", "percentage": 30, "name": "Fondateur 2"},
    # {"address": "erd1...", "percentage": 20, "name": "Dev Lead"},
]

# Advisor vesting schedules
ADVISOR_SCHEDULES = [
    # {"address": "erd1...", "percentage": 40, "name": "Advisor 1"},
    # {"address": "erd1...", "percentage": 30, "name": "Advisor 2"},
    # {"address": "erd1...", "percentage": 30, "name": "Advisor 3"},
]

# Marketing vesting schedules
MARKETING_SCHEDULES = [
    # {"address": "erd1...", "percentage": 100, "name": "Marketing Wallet"},
]


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


def address_to_hex(address: str) -> str:
    """Convert bech32 address to hex."""
    # Use mxpy to decode
    result = subprocess.run(
        ["mxpy", "wallet", "bech32", "--decode", address],
        capture_output=True, text=True
    )
    return result.stdout.strip()


def calculate_allocation(percentage: float) -> int:
    """Calculate token allocation from percentage."""
    return int(TOTAL_SUPPLY_RAW * Decimal(percentage) / Decimal(100))


def format_amount(raw: int) -> str:
    """Format raw amount to display."""
    return f"{Decimal(raw) / Decimal(10 ** TOKEN_DECIMALS):,.6f}"


def run_command(cmd: List[str], description: str) -> tuple:
    """Run a command and return (success, output)."""
    print(f"\n{'='*60}")
    print(f"📌 {description}")
    print(f"{'='*60}")
    print(f"Command: {' '.join(cmd[:5])}...")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            print(f"✅ Success!")
            return True, result.stdout
        else:
            print(f"❌ Error: {result.stderr}")
            return False, result.stderr
    except subprocess.TimeoutExpired:
        print(f"❌ Timeout!")
        return False, "Timeout"
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False, str(e)


def wait_for_transaction(tx_hash: str, proxy: str) -> bool:
    """Wait for transaction to complete."""
    print(f"⏳ Waiting for transaction: {tx_hash[:20]}...")
    time.sleep(6)  # Wait for block
    return True


# =============================================================================
# DEPLOYMENT CLASSES
# =============================================================================

@dataclass
class DeploymentState:
    """Tracks the deployment state."""
    network: str
    pem_path: str
    token_identifier: Optional[str] = None
    sc0_address: Optional[str] = None
    staking_address: Optional[str] = None
    vesting_address: Optional[str] = None
    treasury_address: Optional[str] = None

    def save(self, path: Path):
        """Save state to file."""
        data = {
            "network": self.network,
            "token_identifier": self.token_identifier,
            "contracts": {
                "sc0": self.sc0_address,
                "staking": self.staking_address,
                "vesting": self.vesting_address,
                "treasury": self.treasury_address,
            },
            "distribution": {
                key: {
                    "percentage": val["percentage"],
                    "amount_raw": str(calculate_allocation(val["percentage"])),
                    "amount_display": format_amount(calculate_allocation(val["percentage"])),
                }
                for key, val in DISTRIBUTION.items()
            }
        }
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"💾 State saved to {path}")

    @classmethod
    def load(cls, path: Path, pem_path: str) -> 'DeploymentState':
        """Load state from file."""
        if path.exists():
            with open(path, 'r') as f:
                data = json.load(f)
            state = cls(
                network=data["network"],
                pem_path=pem_path,
                token_identifier=data.get("token_identifier"),
                sc0_address=data.get("contracts", {}).get("sc0"),
                staking_address=data.get("contracts", {}).get("staking"),
                vesting_address=data.get("contracts", {}).get("vesting"),
                treasury_address=data.get("contracts", {}).get("treasury"),
            )
            print(f"📂 Loaded state from {path}")
            return state
        return cls(network="devnet", pem_path=pem_path)


class XCirclexDeployer:
    """Main deployer class."""

    def __init__(self, state: DeploymentState):
        self.state = state
        self.net_config = NETWORKS[state.network]

    # =========================================================================
    # STEP 1: Issue Token
    # =========================================================================

    def issue_token(self) -> bool:
        """Issue the XCIRCLEX token."""
        print("\n" + "="*70)
        print("📜 STEP 1: ISSUE XCIRCLEX TOKEN")
        print("="*70)

        if self.state.token_identifier:
            print(f"✅ Token already issued: {self.state.token_identifier}")
            return True

        # Build data
        data_parts = [
            "issue",
            to_hex(TOKEN_NAME),
            to_hex(TOKEN_TICKER),
            int_to_hex(TOTAL_SUPPLY_RAW),
            int_to_hex(TOKEN_DECIMALS),
            to_hex("canFreeze"), to_hex("true"),
            to_hex("canWipe"), to_hex("true"),
            to_hex("canPause"), to_hex("true"),
            to_hex("canMint"), to_hex("false"),
            to_hex("canBurn"), to_hex("true"),
            to_hex("canChangeOwner"), to_hex("true"),
            to_hex("canUpgrade"), to_hex("true"),
            to_hex("canAddSpecialRoles"), to_hex("true"),
        ]
        data = "@".join(data_parts)

        cmd = [
            "mxpy", "tx", "new",
            "--receiver", ESDT_SYSTEM_SC,
            "--value", str(ISSUE_COST),
            "--gas-limit", "60000000",
            "--data", data,
            "--pem", self.state.pem_path,
            "--chain", self.net_config["chain_id"],
            "--proxy", self.net_config["proxy"],
            "--recall-nonce",
            "--send"
        ]

        success, output = run_command(cmd, "Issuing XCIRCLEX token")

        if success:
            print("\n⚠️  IMPORTANT: Check the transaction on explorer!")
            print(f"   Explorer: {self.net_config['explorer']}")
            print("\n   Find the token identifier in the transaction logs.")
            print("   It will look like: XCIRCLEX-abc123")

            token_id = input("\n   Enter the token identifier: ").strip()
            if token_id:
                self.state.token_identifier = token_id
                return True

        return False

    # =========================================================================
    # STEP 2: Deploy Contracts
    # =========================================================================

    def deploy_staking_contract(self) -> bool:
        """Deploy the staking contract."""
        print("\n" + "="*70)
        print("🏦 STEP 2a: DEPLOY STAKING CONTRACT")
        print("="*70)

        if self.state.staking_address:
            print(f"✅ Staking contract already deployed: {self.state.staking_address}")
            return True

        if not self.state.token_identifier:
            print("❌ Token not issued yet!")
            return False

        wasm_path = Path(__file__).parent.parent / "contracts" / "xcirclex-staking" / "output" / "xcirclex-staking.wasm"

        if not wasm_path.exists():
            print(f"❌ WASM file not found: {wasm_path}")
            print("   Please build the contract first: sc-meta all build")
            return False

        token_hex = to_hex(self.state.token_identifier)

        cmd = [
            "mxpy", "contract", "deploy",
            "--bytecode", str(wasm_path),
            "--pem", self.state.pem_path,
            "--gas-limit", "100000000",
            "--arguments", f"0x{token_hex}",
            "--proxy", self.net_config["proxy"],
            "--chain", self.net_config["chain_id"],
            "--recall-nonce",
            "--send"
        ]

        success, output = run_command(cmd, "Deploying Staking contract")

        if success:
            print("\n   Check the transaction for the contract address.")
            address = input("   Enter the staking contract address: ").strip()
            if address:
                self.state.staking_address = address
                return True

        return False

    def deploy_vesting_contract(self) -> bool:
        """Deploy the vesting contract."""
        print("\n" + "="*70)
        print("📅 STEP 2b: DEPLOY VESTING CONTRACT")
        print("="*70)

        if self.state.vesting_address:
            print(f"✅ Vesting contract already deployed: {self.state.vesting_address}")
            return True

        if not self.state.token_identifier:
            print("❌ Token not issued yet!")
            return False

        wasm_path = Path(__file__).parent.parent / "contracts" / "xcirclex-vesting" / "output" / "xcirclex-vesting.wasm"

        if not wasm_path.exists():
            print(f"❌ WASM file not found: {wasm_path}")
            print("   Please build the contract first: sc-meta all build")
            return False

        token_hex = to_hex(self.state.token_identifier)

        cmd = [
            "mxpy", "contract", "deploy",
            "--bytecode", str(wasm_path),
            "--pem", self.state.pem_path,
            "--gas-limit", "100000000",
            "--arguments", f"0x{token_hex}",
            "--proxy", self.net_config["proxy"],
            "--chain", self.net_config["chain_id"],
            "--recall-nonce",
            "--send"
        ]

        success, output = run_command(cmd, "Deploying Vesting contract")

        if success:
            print("\n   Check the transaction for the contract address.")
            address = input("   Enter the vesting contract address: ").strip()
            if address:
                self.state.vesting_address = address
                return True

        return False

    # =========================================================================
    # STEP 3: Distribute Tokens
    # =========================================================================

    def distribute_tokens(self, recipient: str, amount_raw: int, description: str) -> bool:
        """Send tokens to a recipient."""
        if not self.state.token_identifier:
            print("❌ Token not issued yet!")
            return False

        token_hex = to_hex(self.state.token_identifier)
        amount_hex = int_to_hex(amount_raw)

        data = f"ESDTTransfer@{token_hex}@{amount_hex}"

        cmd = [
            "mxpy", "tx", "new",
            "--receiver", recipient,
            "--value", "0",
            "--gas-limit", "500000",
            "--data", data,
            "--pem", self.state.pem_path,
            "--chain", self.net_config["chain_id"],
            "--proxy", self.net_config["proxy"],
            "--recall-nonce",
            "--send"
        ]

        success, output = run_command(cmd, f"Distributing to {description}")
        return success

    def distribute_to_staking(self) -> bool:
        """Distribute staking rewards allocation."""
        if not self.state.staking_address:
            print("❌ Staking contract not deployed!")
            return False

        amount = calculate_allocation(DISTRIBUTION["staking_rewards"]["percentage"])
        return self.distribute_tokens(
            self.state.staking_address,
            amount,
            f"Staking SC ({format_amount(amount)} XCIRCLEX)"
        )

    def distribute_to_vesting(self) -> bool:
        """Distribute team + advisors + marketing allocation."""
        if not self.state.vesting_address:
            print("❌ Vesting contract not deployed!")
            return False

        # Total for vesting: team (10%) + advisors (3%) + marketing (5%) = 18%
        total_percentage = (
            DISTRIBUTION["team"]["percentage"] +
            DISTRIBUTION["advisors"]["percentage"] +
            DISTRIBUTION["marketing"]["percentage"]
        )
        amount = calculate_allocation(total_percentage)

        return self.distribute_tokens(
            self.state.vesting_address,
            amount,
            f"Vesting SC ({format_amount(amount)} XCIRCLEX)"
        )

    # =========================================================================
    # STEP 4: Create Vesting Schedules
    # =========================================================================

    def create_team_schedule(self, beneficiary: str, amount: int, name: str) -> bool:
        """Create a team vesting schedule."""
        if not self.state.vesting_address:
            print("❌ Vesting contract not deployed!")
            return False

        beneficiary_hex = address_to_hex(beneficiary)
        amount_hex = int_to_hex(amount)

        data = f"createTeamVesting@{beneficiary_hex}@{amount_hex}"

        cmd = [
            "mxpy", "tx", "new",
            "--receiver", self.state.vesting_address,
            "--value", "0",
            "--gas-limit", "10000000",
            "--data", data,
            "--pem", self.state.pem_path,
            "--chain", self.net_config["chain_id"],
            "--proxy", self.net_config["proxy"],
            "--recall-nonce",
            "--send"
        ]

        success, output = run_command(cmd, f"Creating team vesting for {name}")
        return success

    def create_advisor_schedule(self, beneficiary: str, amount: int, name: str) -> bool:
        """Create an advisor vesting schedule."""
        if not self.state.vesting_address:
            print("❌ Vesting contract not deployed!")
            return False

        beneficiary_hex = address_to_hex(beneficiary)
        amount_hex = int_to_hex(amount)

        data = f"createAdvisorVesting@{beneficiary_hex}@{amount_hex}"

        cmd = [
            "mxpy", "tx", "new",
            "--receiver", self.state.vesting_address,
            "--value", "0",
            "--gas-limit", "10000000",
            "--data", data,
            "--pem", self.state.pem_path,
            "--chain", self.net_config["chain_id"],
            "--proxy", self.net_config["proxy"],
            "--recall-nonce",
            "--send"
        ]

        success, output = run_command(cmd, f"Creating advisor vesting for {name}")
        return success

    def create_marketing_schedule(self, beneficiary: str, amount: int, name: str) -> bool:
        """Create a marketing vesting schedule."""
        if not self.state.vesting_address:
            print("❌ Vesting contract not deployed!")
            return False

        beneficiary_hex = address_to_hex(beneficiary)
        amount_hex = int_to_hex(amount)

        data = f"createMarketingVesting@{beneficiary_hex}@{amount_hex}"

        cmd = [
            "mxpy", "tx", "new",
            "--receiver", self.state.vesting_address,
            "--value", "0",
            "--gas-limit", "10000000",
            "--data", data,
            "--pem", self.state.pem_path,
            "--chain", self.net_config["chain_id"],
            "--proxy", self.net_config["proxy"],
            "--recall-nonce",
            "--send"
        ]

        success, output = run_command(cmd, f"Creating marketing vesting for {name}")
        return success

    def create_all_vesting_schedules(self) -> bool:
        """Create all vesting schedules."""
        print("\n" + "="*70)
        print("📅 STEP 5: CREATE VESTING SCHEDULES")
        print("="*70)

        team_total = calculate_allocation(DISTRIBUTION["team"]["percentage"])
        advisor_total = calculate_allocation(DISTRIBUTION["advisors"]["percentage"])
        marketing_total = calculate_allocation(DISTRIBUTION["marketing"]["percentage"])

        # Team schedules
        print("\n🏢 Team Vesting Schedules:")
        if not TEAM_SCHEDULES:
            print("   ⚠️ No team schedules configured. Edit TEAM_SCHEDULES in the script.")
        else:
            for schedule in TEAM_SCHEDULES:
                amount = int(team_total * schedule["percentage"] / 100)
                self.create_team_schedule(schedule["address"], amount, schedule["name"])

        # Advisor schedules
        print("\n🎓 Advisor Vesting Schedules:")
        if not ADVISOR_SCHEDULES:
            print("   ⚠️ No advisor schedules configured. Edit ADVISOR_SCHEDULES in the script.")
        else:
            for schedule in ADVISOR_SCHEDULES:
                amount = int(advisor_total * schedule["percentage"] / 100)
                self.create_advisor_schedule(schedule["address"], amount, schedule["name"])

        # Marketing schedules
        print("\n📢 Marketing Vesting Schedules:")
        if not MARKETING_SCHEDULES:
            print("   ⚠️ No marketing schedules configured. Edit MARKETING_SCHEDULES in the script.")
        else:
            for schedule in MARKETING_SCHEDULES:
                amount = int(marketing_total * schedule["percentage"] / 100)
                self.create_marketing_schedule(schedule["address"], amount, schedule["name"])

        return True


# =============================================================================
# MAIN
# =============================================================================

def print_banner():
    print("""
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║     ██╗  ██╗ ██████╗██╗██████╗  ██████╗██╗     ███████╗██╗  ██╗          ║
║     ╚██╗██╔╝██╔════╝██║██╔══██╗██╔════╝██║     ██╔════╝╚██╗██╔╝          ║
║      ╚███╔╝ ██║     ██║██████╔╝██║     ██║     █████╗   ╚███╔╝           ║
║      ██╔██╗ ██║     ██║██╔══██╗██║     ██║     ██╔══╝   ██╔██╗           ║
║     ██╔╝ ██╗╚██████╗██║██║  ██║╚██████╗███████╗███████╗██╔╝ ██╗          ║
║     ╚═╝  ╚═╝ ╚═════╝╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝          ║
║                                                                           ║
║                    COMPLETE DEPLOYMENT SCRIPT                             ║
║                    π × 10^8 = 314,159,265 XCIRCLEX                        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
    """)


def print_distribution():
    print("\n📊 TOKEN DISTRIBUTION:")
    print("-" * 60)
    for key, val in DISTRIBUTION.items():
        amount = calculate_allocation(val["percentage"])
        print(f"   {val['name']:25} {val['percentage']:3}%  {format_amount(amount):>25} XCIRCLEX")
    print("-" * 60)
    print(f"   {'TOTAL':25} 100%  {format_amount(TOTAL_SUPPLY_RAW):>25} XCIRCLEX")


def main():
    parser = argparse.ArgumentParser(description="Deploy X-CIRCLE-X ecosystem")
    parser.add_argument("--network", default="devnet", choices=["devnet", "testnet", "mainnet"])
    parser.add_argument("--pem", required=True, help="Path to PEM wallet file")
    parser.add_argument("--state", default="deployment_state.json", help="State file path")
    parser.add_argument("--step", type=int, help="Run only a specific step (1-5)")
    args = parser.parse_args()

    print_banner()
    print(f"\n🌐 Network: {args.network.upper()}")
    print(f"🔑 PEM: {args.pem}")
    print(f"💾 State: {args.state}")

    print_distribution()

    # Load or create state
    state_path = Path(args.state)
    state = DeploymentState.load(state_path, args.pem)
    state.network = args.network
    state.pem_path = args.pem

    deployer = XCirclexDeployer(state)

    steps = {
        1: ("Issue Token", deployer.issue_token),
        2: ("Deploy Staking", deployer.deploy_staking_contract),
        3: ("Deploy Vesting", deployer.deploy_vesting_contract),
        4: ("Distribute to Staking", deployer.distribute_to_staking),
        5: ("Distribute to Vesting", deployer.distribute_to_vesting),
        6: ("Create Vesting Schedules", deployer.create_all_vesting_schedules),
    }

    if args.step:
        # Run single step
        if args.step in steps:
            name, func = steps[args.step]
            print(f"\n▶️ Running Step {args.step}: {name}")
            func()
            state.save(state_path)
        else:
            print(f"❌ Invalid step: {args.step}")
    else:
        # Run all steps interactively
        print("\n" + "="*70)
        print("DEPLOYMENT STEPS:")
        print("="*70)
        for num, (name, _) in steps.items():
            print(f"   {num}. {name}")

        print("\n⚠️  This will deploy the full X-CIRCLE-X ecosystem!")
        confirm = input("\nProceed? (yes/no): ").strip().lower()

        if confirm != "yes":
            print("❌ Aborted.")
            return

        for num, (name, func) in steps.items():
            print(f"\n{'='*70}")
            print(f"▶️ Step {num}: {name}")
            print(f"{'='*70}")

            success = func()
            state.save(state_path)

            if not success:
                print(f"\n❌ Step {num} failed. Fix the issue and re-run with --step {num}")
                break

            if num < len(steps):
                cont = input(f"\n   Continue to step {num+1}? (yes/no): ").strip().lower()
                if cont != "yes":
                    print("   Pausing deployment. Re-run to continue.")
                    break

    print("\n" + "="*70)
    print("📋 FINAL STATE:")
    print("="*70)
    print(f"   Token: {state.token_identifier or 'Not issued'}")
    print(f"   Staking SC: {state.staking_address or 'Not deployed'}")
    print(f"   Vesting SC: {state.vesting_address or 'Not deployed'}")
    print("\n✅ Deployment script complete!")
    print(f"   State saved to: {state_path}")


if __name__ == "__main__":
    main()
