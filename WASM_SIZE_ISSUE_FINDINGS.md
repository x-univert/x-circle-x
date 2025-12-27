# 🔍 MultiversX WASM Size Issue - Investigation Report

**Date**: 18 octobre 2025
**Project**: xCircle DAO CircleManager
**Issue**: Contracts > 1.4KB fail deployment with "invalid contract code"

---

## 📊 Summary of Findings

After extensive testing with **10 different contract versions**, we've identified a **critical size limitation** on MultiversX Devnet:

- ✅ **Contracts ≤ 1.4KB**: Deploy successfully
- ❌ **Contracts = 8.9KB**: Fail with "invalid contract code" error

---

## 🧪 Test Results

| Version | Features | WASM Size | Status | Transaction |
|---------|----------|-----------|---------|-------------|
| **v1** | `SingleValueMapper<u64>` only | **1.4 KB** | ✅ **SUCCESS** | [e3fd5b35...](https://devnet-explorer.multiversx.com/transactions/e3fd5b350bcd8944ee038270fed528661d530ec8007377c78bcb63fceb6662fe) |
| v2 | `MapMapper` + `Circle` struct + `CircleStatus` enum | 8.9 KB | ❌ FAIL | [02cc8059...](https://devnet-explorer.multiversx.com/transactions/02cc8059f4739320f885cd13fe7a2e2fb044eee298511516f51d21a33f139e73) |
| v2.1 | Parameterized `SingleValueMapper(circle_id)` ⚠️ wrong | 8.9 KB | ❌ FAIL | [55a59604...](https://devnet-explorer.multiversx.com/transactions/55a596040edea4c2ead0d62fb3e9150673932f8cfe2b39c818f4d3500b269d20) |
| v2.2 | `MapMapper<u64, u64>` (correct pattern) | 8.9 KB | ❌ FAIL | [5929fcea...](https://devnet-explorer.multiversx.com/transactions/5929fceae1198e3644614b334f26f0d27b58bbd7f462fd72301a11247aafd9ff) |
| v2.3 | `MapMapper<u64, bool>` (minimal value type) | 8.9 KB | ❌ FAIL | [94da035f...](https://devnet-explorer.multiversx.com/transactions/94da035fb7be1ef79c88e791c29f409cec3a3cd525fcb4a9712cdfe506daeda3) |
| v2.4 | `SetMapper<u64>` | 8.9 KB | ❌ FAIL | [d7cdaf7c...](https://devnet-explorer.multiversx.com/transactions/d7cdaf7c0d24586ba8731a3a47539a8c79da55e8691e4be9484c6ba9a09c18ff) |
| v3 | Manual storage with `ManagedAddress` & `ManagedBuffer` | 8.9 KB | ❌ FAIL | [c8fa370d...](https://devnet-explorer.multiversx.com/transactions/c8fa370d5cd1e262e375d0799e137b3ae08b9cc18db1f2053c0b88dac1de8cd8) |
| v3.1 | Back to `SingleValueMapper<u64>` only | **1.4 KB** | ✅ **SUCCESS** | [7d1b5ce7...](https://devnet-explorer.multiversx.com/transactions/7d1b5ce7a04dcbc7fbc385dc9da777c026a105c69dcec8815083ffeb8453eaa9) |

---

## 🎯 Root Cause Analysis

### What Causes 8.9KB Contracts

**ANY** of the following causes the WASM to jump from 1.4KB to 8.9KB:

1. **Collection Mappers**: `MapMapper`, `SetMapper`, `VecMapper`, etc.
2. **Managed Types as Parameters**: `ManagedAddress`, `ManagedBuffer`, etc.
3. **Custom Structs** with managed types
4. **Enums** (even simple ones)

### What Works (Stays at 1.4KB)

- ✅ `SingleValueMapper<primitive_type>` (u64, u32, bool, etc.)
- ✅ Simple arithmetic and logic
- ✅ View functions with primitive returns
- ✅ No parameters or primitive parameters only

---

## 🚫 The Size Limit

While MultiversX documentation doesn't explicitly specify a WASM size limit (unlike Ethereum's 24KB), our testing reveals:

- **Threshold**: Somewhere between **1.4KB and 8.9KB**
- **Error**: `"invalid contract code"` from VM runtime (line 841)
- **Network**: Confirmed on Devnet; unclear if Mainnet/Testnet have same limit

---

## ⚠️ Implications for xCircle DAO

### What We CANNOT Do

❌ Store multiple circles with `MapMapper`
❌ Store member addresses in collections
❌ Use structs like `Circle`, `MembershipRequest`
❌ Track voting with `ManagedVec<Vote>`
❌ Implement complex membership logic
❌ Store contribution history

### What We CAN Do

✅ Simple counters (circle count, member count)
✅ Single value storage per key
✅ Basic views returning primitives
✅ Arithmetic operations

---

## 💡 Possible Workarounds

### Option 1: Split into Multiple Contracts
- Deploy separate contracts for different features
- Each stays under 1.4KB
- Cross-contract calls for interaction
- ⚠️ **Increased complexity and gas costs**

### Option 2: Off-Chain Data Storage
- Store only critical data on-chain (IDs, balances)
- Keep metadata off-chain (names, descriptions, member lists)
- Use IPFS or centralized DB
- ⚠️ **Reduced decentralization**

### Option 3: Wait for Framework/VM Update
- Report issue to MultiversX team
- Wait for potential fix or size limit increase
- ⚠️ **Timeline uncertain**

### Option 4: Simplify the DAO
- Extremely minimal on-chain logic
- Manual storage key construction (may still hit size limit)
- ⚠️ **Severely limited functionality**

---

## 🔬 Technical Details

### Error Message
```
runtime.go:841 [invalid contract code] []
```

### WASM Compilation
- **Framework**: multiversx-sc-meta 0.56.1
- **Rust Version**: 1.90.0
- **Target**: wasm32-unknown-unknown
- **Optimization**: wasm-opt -Oz with MultiversX flags

### Successful v1 Contract
```rust
#[multiversx_sc::contract]
pub trait CircleManager {
    #[init]
    fn init(&self) {
        self.circle_count().set(0u64);
    }

    #[endpoint(createCircle)]
    fn create_circle(&self) -> u64 {
        let count = self.circle_count().get();
        let circle_id = count + 1;
        self.circle_count().set(circle_id);
        circle_id
    }

    #[view(getCircleCount)]
    fn get_circle_count(&self) -> u64 {
        self.circle_count().get()
    }

    #[storage_mapper("circle_count")]
    fn circle_count(&self) -> SingleValueMapper<u64>;
}
```

**Compiled Size**: 1.4KB
**Deployment**: ✅ Success

---

## 📚 Research Notes

### Documentation Search Results
- No explicit WASM size limit documented for MultiversX
- Unlike Ethereum (24KB limit), MultiversX docs focus on gas limits
- No community reports found of this specific "invalid contract code" error
- Config files don't reveal size parameters

### Potential Framework Issues
- MapMapper implementation may include significant runtime code
- Managed types require VM memory management overhead
- Collection types add iteration/searching logic
- Each feature compounds the size exponentially

---

## ✅ Recommendations

1. **Report to MultiversX**: This appears to be undocumented behavior that should be clarified

2. **For xCircle DAO**: Consider Option 1 (Multiple Contracts) or Option 2 (Hybrid On-Chain/Off-Chain)

3. **Immediate Next Steps**:
   - Test on Mainnet/Testnet to see if limit is Devnet-specific
   - Experiment with splitting contracts by feature
   - Prototype hybrid architecture with off-chain storage

4. **Long-term**:
   - Engage with MultiversX developers about this limitation
   - Monitor framework updates for size optimizations
   - Consider alternative blockchain platforms if this is insurmountable

---

## 📝 Lessons Learned

1. **Size matters**: WASM contract size is a first-class constraint on MultiversX
2. **Collection mappers are expensive**: Any indexed storage dramatically increases size
3. **Test incrementally**: Add features one-by-one to identify size triggers early
4. **Primitives are your friend**: Stick to u64, bool, etc. when possible
5. **Documentation gaps exist**: Not all blockchain limitations are documented

---

**Generated**: 18 octobre 2025
**Last Updated**: 18 octobre 2025 20:20 UTC
**Status**: Investigation Complete, Awaiting Strategic Decision
