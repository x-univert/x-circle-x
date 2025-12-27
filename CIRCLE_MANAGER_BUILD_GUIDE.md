# 🏗️ Circle Manager Smart Contract - Guide de Build

## ✅ Configuration Finale (Version 0.62.0)

Le smart contract CircleManager est maintenant configuré **exactement comme DEMOCRATIX** et fonctionne avec la commande `sc-meta all build`.

---

## 📋 Prérequis

- **Rust** (nightly recommandé)
- **sc-meta** version 0.62.0 ou supérieure
- **wasm-opt** (optionnel, pour optimisation)
- **WSL** (si vous êtes sur Windows)

### Vérification des versions
```bash
rustc --version
sc-meta --version  # Doit être >= 0.62.0
wasm-opt --version # Optionnel
```

---

## 🚀 Compilation du Contract

### Option 1 : Commande sc-meta (Recommandée)
```bash
cd /mnt/c/Users/DEEPGAMING/MultiversX/X-CIRCLE-X/contracts/circle-manager
sc-meta all build
```

### Option 2 : Script build.sh
```bash
cd /mnt/c/Users/DEEPGAMING/MultiversX/X-CIRCLE-X/contracts/circle-manager
bash build.sh
```

### Option 3 : Depuis Windows avec WSL
```bash
wsl --exec bash -l -c "cd /mnt/c/Users/DEEPGAMING/MultiversX/X-CIRCLE-X/contracts/circle-manager && sc-meta all build"
```

---

## 📦 Fichiers Générés

Après compilation, vous trouverez dans `output/` :

| Fichier | Taille | Description |
|---------|--------|-------------|
| `circle-manager.wasm` | ~11 KB | Contract compilé (non optimisé) |
| `circle-manager.abi.json` | ~11 KB | ABI pour intégration frontend |
| `circle-manager.imports.json` | ~888 B | Imports du contract |
| `circle-manager.mxsc.json` | ~35 KB | Métadonnées complètes |

---

## ⚡ Optimisation WASM

### Avec wasm-opt (Windows)
```bash
wasm-opt -Oz --enable-bulk-memory --enable-sign-ext --enable-mutable-globals ^
  contracts/circle-manager/output/circle-manager.wasm ^
  -o contracts/circle-manager/output/circle-manager-optimized.wasm
```

### Avec wasm-opt (Linux/WSL)
```bash
wasm-opt -Oz --enable-bulk-memory --enable-sign-ext --enable-mutable-globals \
  output/circle-manager.wasm \
  -o output/circle-manager-optimized.wasm
```

**Résultat** : ~11 KB → ~8.2 KB (réduction de 25%)

---

## 📁 Structure du Projet

```
contracts/circle-manager/
├── Cargo.toml              # Package principal (v0.62.0)
├── multiversx.json         # Configuration sc-meta ⚡ IMPORTANT
├── build.sh                # Script de build automatique
├── src/
│   └── lib.rs             # Code source du contract
├── meta/
│   ├── Cargo.toml         # Meta package (v0.62.0)
│   └── src/
│       └── main.rs        # Point d'entrée sc-meta
├── wasm/
│   └── Cargo.toml         # WASM adapter (v0.62.0)
└── output/
    ├── circle-manager.wasm
    ├── circle-manager.abi.json
    ├── circle-manager.imports.json
    └── circle-manager.mxsc.json
```

---

## 🔑 Changements Clés (v0.56.1 → v0.62.0)

### 1. Versions mises à jour
```toml
# Avant (v0.56.1)
[dependencies.multiversx-sc]
version = "0.56.1"

# Après (v0.62.0)
[dependencies.multiversx-sc]
version = "0.62.0"
```

### 2. Fichier multiversx.json créé
Ce fichier permet à `sc-meta` de détecter le contract :
```json
{
  "buildInfo": {
    "contractCrate": {
      "name": "circle-manager",
      "version": "0.1.0"
    },
    "framework": {
      "name": "multiversx-sc",
      "version": "0.62.0"
    }
  }
}
```

### 3. Correction meta/Cargo.toml
```toml
# Avant : underscore (❌)
[dependencies.circle_manager]
path = ".."

# Après : tiret (✅)
[dependencies.circle-manager]
path = ".."
```

### 4. Workspace supprimé du Cargo.toml principal
Comme DEMOCRATIX, pas de section `[workspace]` dans le Cargo.toml principal.

---

## 🎯 Fonctionnalités du Contract

Le CircleManager v0.62.0 implémente :

✅ **createCircle** - Création de cercles de tontine
✅ **requestMembership** - Demande d'adhésion
✅ **voteForMember** - Vote multi-signature (>50%)
✅ **contribute** - Contributions EGLD par cycle
✅ **distributeFunds** - Distribution automatique + rotation
✅ **Frais 3%** - Collectés pour la treasury
✅ **Events** - Tous les événements blockchain
✅ **Views** - getCircle, getCircleMembers, getTreasuryBalance, etc.

---

## 🚢 Déploiement

### 1. Compiler et optimiser
```bash
cd contracts/circle-manager
sc-meta all build
wasm-opt -Oz --enable-bulk-memory --enable-sign-ext --enable-mutable-globals \
  output/circle-manager.wasm -o output/circle-manager-optimized.wasm
```

### 2. Déployer sur Devnet
```bash
mxpy contract deploy \
  --bytecode=output/circle-manager-optimized.wasm \
  --pem=~/wallet.pem \
  --gas-limit=100000000 \
  --chain=D \
  --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce
```

### 3. Mettre à jour le frontend
```typescript
// frontend/src/config/contracts.ts
export const CIRCLE_MANAGER_ADDRESS = 'erd1qqqqqqqqqqqqqpgq...'
```

---

## 🐛 Dépannage

### "Found 0 contract crates"
✅ **Solution** : Vérifiez que `multiversx.json` existe à la racine du contract

### "no matching package found: circle_manager"
✅ **Solution** : Dans `meta/Cargo.toml`, utilisez `[dependencies.circle-manager]` avec tiret

### "wasm-opt not installed"
⚠️ **Info** : C'est un avertissement, pas une erreur. Le WASM est généré mais non optimisé.
✅ **Solution** : Installez wasm-opt ou optimisez manuellement après.

---

## 📊 Comparaison avec DEMOCRATIX

| Aspect | DEMOCRATIX | X-CIRCLE-X | Status |
|--------|-----------|------------|--------|
| MultiversX SC | 0.62.0 | 0.62.0 | ✅ |
| Structure dossiers | meta/, wasm/, output/ | meta/, wasm/, output/ | ✅ |
| multiversx.json | ✓ | ✓ | ✅ |
| sc-meta all build | ✓ | ✓ | ✅ |
| build.sh | ✓ | ✓ | ✅ |
| Fichiers output | .wasm, .abi.json, .imports.json, .mxsc.json | .wasm, .abi.json, .imports.json, .mxsc.json | ✅ |

**✅ Configuration 100% identique à DEMOCRATIX !**

---

## 📝 Historique des Modifications

### 16 Novembre 2025
- ✅ Mise à jour vers MultiversX SC 0.62.0
- ✅ Création du fichier `multiversx.json`
- ✅ Correction des dépendances dans `meta/Cargo.toml`
- ✅ Suppression de la section `[workspace]`
- ✅ Commande `sc-meta all build` fonctionnelle
- ✅ Script `build.sh` mis à jour
- ✅ Optimisation WASM : 11 KB → 8.2 KB

---

## 📚 Ressources

- [MultiversX Smart Contracts](https://docs.multiversx.com/developers/smart-contracts/overview)
- [sc-meta Documentation](https://docs.multiversx.com/developers/meta/sc-meta)
- [WASM Optimization](https://github.com/WebAssembly/binaryen)

---

**✨ Le contract est prêt pour le déploiement sur Devnet !**
