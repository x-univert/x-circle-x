# 🚀 Guide de Démarrage Rapide - xCircle DAO

**Bienvenue !** Ce guide vous aidera à démarrer avec le projet, que vous soyez développeur ou contributeur non-technique.

---

## 📋 Étapes Initiales (À faire maintenant)

### 1. ✅ Initialiser Git et GitHub

```bash
# Dans votre terminal (Git Bash sur Windows)
cd "C:\Users\DEEPGAMING\MultiversX\X-CIRCLE-X-MULTIVERTUEU-X"

# Initialiser le repository git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "🎉 Initial commit: xCircle DAO project structure

- Complete documentation (README, WHITEPAPER, CONTRIBUTING)
- Smart contract CircleManager (Rust/MultiversX)
- Business plan and roadmap
- GitHub templates and CI/CD setup
- Project structure ready for development"

# Créer le repository sur GitHub (via interface web)
# Puis lier le repo local au remote:
git remote add origin https://github.com/[VOTRE-USERNAME]/xcircle-dao.git

# Pousser le code
git branch -M main
git push -u origin main
```

**Alternative plus simple** :
1. Allez sur https://github.com/new
2. Nommez le repo : `xcircle-dao`
3. Description : "Decentralized ROSCA platform on MultiversX"
4. Public (pour open-source)
5. Ne cochez PAS "Initialize with README" (on l'a déjà !)
6. Cliquez "Create repository"
7. Suivez les instructions "push an existing repository"

### 2. ✅ Installer les Outils de Développement

#### Pour Smart Contracts (Rust + MultiversX)

```bash
# 1. Installer Rust
# Visitez: https://rustup.rs/
# Ou exécutez:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Installer Python 3.8+ (pour mxpy)
# Téléchargez depuis: https://www.python.org/downloads/

# 3. Installer mxpy (MultiversX CLI)
pip3 install multiversx-sdk-cli --upgrade

# 4. Vérifier les installations
rustc --version   # Devrait afficher: rustc 1.75+ ou supérieur
mxpy --version    # Devrait afficher: mxpy 9.x.x

# 5. Compiler le contrat Circle Manager
cd contracts/circle-manager
mxpy contract build
```

**Résultat attendu** :
- Fichier `output/circle-manager.wasm` créé ✅
- Fichier `output/circle-manager.abi.json` créé ✅

#### Pour Frontend (React + TypeScript)

```bash
# 1. Installer Node.js v18+
# Téléchargez depuis: https://nodejs.org/

# 2. Installer pnpm (gestionnaire de paquets rapide)
npm install -g pnpm

# 3. Vérifier
node --version  # v18+ ou supérieur
pnpm --version  # 8.x ou supérieur
```

### 3. ✅ Créer votre Wallet MultiversX

Pour tester sur Devnet (réseau de test) :

**Option 1 : Via mxpy (ligne de commande)**
```bash
# Créer un nouveau wallet
mxpy wallet derive ./wallet-dev.pem

# ⚠️ IMPORTANT : Notez la seed phrase affichée !
# Gardez le fichier wallet-dev.pem SECRET !
```

**Option 2 : Via xPortal Web Wallet**
1. Allez sur https://devnet-wallet.multiversx.com
2. Cliquez "Create Wallet"
3. Sauvegardez votre seed phrase (24 mots) !!
4. Notez votre adresse (commence par erd1...)

**Obtenir des tokens de test** :
1. Allez sur https://devnet-wallet.multiversx.com/faucet
2. Collez votre adresse
3. Cliquez "Request" → Vous recevez 30 xEGLD

---

## 🎯 Prochaines Étapes de Développement

### Semaine 1 : Tests et Améliorations Smart Contract

**Priorité 1 : Ajouter des tests**
```bash
cd contracts/circle-manager

# Créer fichier de test
# Le contenu sera dans tests/circle_manager_test.rs
```

**Tâches** :
- [ ] Écrire tests unitaires pour `createCircle`
- [ ] Tester le flux complet d'admission membre
- [ ] Tester contributions et distributions
- [ ] Vérifier calcul des frais (3%)
- [ ] Atteindre 80%+ test coverage

### Semaine 2 : Déploiement Devnet et Frontend de Base

**Smart Contract** :
- [ ] Déployer sur Devnet
- [ ] Tester avec plusieurs wallets
- [ ] Créer un cercle test
- [ ] Documenter l'adresse du contrat

**Frontend** :
```bash
cd dapp

# Initialiser le projet React
pnpm create vite . --template react-ts

# Installer dépendances
pnpm install

# Installer MultiversX SDK
pnpm add @multiversx/sdk-core @multiversx/sdk-dapp @multiversx/sdk-network-providers

# Installer TailwindCSS
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Lancer le serveur de dev
pnpm dev
```

**Tâches Frontend** :
- [ ] Setup connexion xPortal
- [ ] Page d'accueil (landing)
- [ ] Page explorer (liste cercles)
- [ ] Page création de cercle
- [ ] Intégration avec smart contract

### Semaine 3-4 : NFT et Token

**NFT de Réputation** :
- [ ] Créer contrat ReputationNFT
- [ ] Dessiner les 5 niveaux de NFT
- [ ] Intégrer avec CircleManager
- [ ] Tests

**Token $XCIRCLE** :
- [ ] Émettre token ESDT sur Devnet
- [ ] Créer contrat de gouvernance basique
- [ ] Implémenter staking simple
- [ ] Tests

---

## 💡 Conseils pour Réussir

### 1. Organisation du Travail

**Utilisez GitHub Projects** :
1. Créez un Project sur GitHub (onglet "Projects")
2. Utilisez un Kanban board :
   - To Do
   - In Progress
   - Review
   - Done
3. Créez des issues pour chaque tâche
4. Assignez-vous les issues

**Branches Git** :
```bash
# Ne travaillez JAMAIS directement sur main !

# Créer une branche pour chaque feature
git checkout -b feature/add-tests
# ... faire vos modifications ...
git add .
git commit -m "test: add unit tests for createCircle"
git push origin feature/add-tests

# Puis créez une Pull Request sur GitHub
# Reviewez vous-même avant de merger
```

### 2. Documentation

**Documentez au fur et à mesure** :
- ✅ Commentez votre code (surtout en français pour vous aider)
- ✅ Mettez à jour le README quand vous ajoutez des features
- ✅ Notez les décisions importantes dans `docs/`

**Exemple de bonne pratique** :
```rust
/// Crée un nouveau cercle d'épargne rotative
///
/// Cette fonction initialise un cercle avec les paramètres fournis.
/// Le créateur devient automatiquement le premier membre.
///
/// # Arguments
/// * `contribution_amount` - Montant en EGLD par cycle (> 0)
/// * `cycle_duration` - Durée en secondes (minimum 1 jour = 86400)
/// * `max_members` - Entre 3 et 50 membres
///
/// # Returns
/// L'ID unique du cercle créé (u64)
///
/// # Errors
/// - "Contribution must be greater than 0" si montant = 0
/// - "Members must be between 3 and 50" si hors limites
/// - "Cycle must be at least 1 day" si durée < 1 jour
#[endpoint(createCircle)]
fn create_circle(...) { ... }
```

### 3. Testing

**Testez chaque feature** :
```bash
# Tests unitaires Rust
cd contracts/circle-manager
cargo test

# Tests avec mxpy (scénarios)
mxpy contract test

# Tests manuels sur Devnet
mxpy contract call ...
```

**Checklist avant de commiter** :
- [ ] Le code compile sans warnings
- [ ] Les tests passent
- [ ] La documentation est à jour
- [ ] Le code est formaté (`cargo fmt`)
- [ ] Pas de fichiers secrets (.pem, .env)

### 4. Demander de l'Aide

**Où chercher de l'aide** :

**MultiversX** :
- 📚 Docs officielles : https://docs.multiversx.com
- 💬 Discord MultiversX : https://discord.gg/multiversx
- 📖 Exemples : https://github.com/multiversx/mx-sdk-rs/tree/master/contracts/examples

**Rust** :
- 📚 The Rust Book (en français) : https://jimskapt.github.io/rust-book-fr/
- 💬 Forum Rust FR : https://users.rust-lang.org/

**React/Frontend** :
- 📚 React Docs : https://react.dev
- 📚 MultiversX dApp Template : https://github.com/multiversx/mx-template-dapp

**AI Assistants** :
- Claude Code (moi ! 😊) - continuez à me poser des questions
- GitHub Copilot
- ChatGPT pour questions générales

---

## 📊 Suivi de Progression

### Checklist Milestone 1 (MVP - 8 semaines)

#### Semaine 1-2 ✅ (FAIT!)
- [x] Structure projet
- [x] Documentation (README, WHITEPAPER)
- [x] Smart contract CircleManager de base
- [x] Configuration build

#### Semaine 3-4 (À FAIRE)
- [ ] Tests unitaires CircleManager (>80% coverage)
- [ ] Déploiement Devnet
- [ ] Frontend React setup
- [ ] Connexion xPortal fonctionnelle

#### Semaine 5-6 (FUTURES)
- [ ] Interface création cercle
- [ ] Interface liste/explorer cercles
- [ ] Dashboard utilisateur
- [ ] Intégrations blockchain complètes

#### Semaine 7-8 (FUTURES)
- [ ] NFT Réputation contract
- [ ] Token $XCIRCLE
- [ ] Tests end-to-end
- [ ] Documentation utilisateur

---

## 🎁 Ressources Utiles

### Templates et Exemples

**Smart Contracts MultiversX** :
```bash
# Cloner les exemples officiels
git clone https://github.com/multiversx/mx-sdk-rs.git
cd mx-sdk-rs/contracts/examples

# Examiner :
# - crowdfunding-esdt : gestion de fonds
# - lottery-esdt : randomisation
# - multisig : multi-signature
```

**Frontend dApp** :
```bash
# Template officiel MultiversX
git clone https://github.com/multiversx/mx-template-dapp.git

# Examiner la structure et l'intégration wallet
```

### Outils de Développement

**Visual Studio Code Extensions** :
- Rust Analyzer (pour Rust)
- ESLint (pour TypeScript)
- Prettier (formatage code)
- GitLens (historique Git)
- TODO Highlight (surligner les TODOs)

**Explorateurs Blockchain** :
- Devnet Explorer : https://devnet-explorer.multiversx.com
- Testnet Explorer : https://testnet-explorer.multiversx.com
- Mainnet Explorer : https://explorer.multiversx.com

---

## 💰 Plan de Financement

### Grants à Appliquer (Priorité)

#### 1. MultiversX Builders Program 🎯
**Montant** : $50k - $200k
**Deadline** : Rolling (toujours ouvert)
**Lien** : https://multiversx.com/builders

**Comment appliquer** :
1. Créer pitch deck (10-15 slides)
2. Démo vidéo (3-5 minutes)
3. GitHub avec code MVP
4. Remplir formulaire en ligne

**Timeline** : 4-8 semaines de review

#### 2. Gitcoin Grants 🌍
**Montant** : Variable ($5k - $50k selon matching)
**Deadline** : Rounds trimestriels
**Lien** : https://grants.gitcoin.co

**Comment** :
1. Créer profil projet
2. Soumettre pour round suivant
3. Promouvoir dans communauté
4. Recevoir donations + matching pool

#### 3. Autres Grants
- Protocol Labs : https://grants.protocol.ai
- Ethereum Foundation (si multi-chain) : https://esp.ethereum.foundation
- Grants locaux crypto (selon votre pays)

### Crowdfunding Communautaire

**Optionnel - si grants insuffisants** :
- Mirror.xyz : Articles payants + collecte
- Kickstarter/Indiegogo : Pour produit grand public
- Direct : Adresse donation MultiversX

---

## 🚨 Erreurs Fréquentes à Éviter

### ❌ Git & GitHub
```bash
# MAUVAIS : Commiter des secrets
git add wallet.pem  # ❌ JAMAIS !

# BON : Vérifier .gitignore
# Le .gitignore est déjà configuré pour exclure :
# *.pem, *.key, .env, secrets/, etc.
```

### ❌ Smart Contracts
```rust
// MAUVAIS : Pas de validation
#[endpoint]
fn transfer_all(&self, to: ManagedAddress) {
    // ❌ N'importe qui peut appeler !
    let balance = self.blockchain().get_sc_balance(...);
    self.send().direct_egld(&to, &balance);
}

// BON : Vérifications
#[endpoint]
fn transfer_all(&self, to: ManagedAddress) {
    let caller = self.blockchain().get_caller();
    require!(caller == self.owner().get(), "Only owner");
    // ✅ Sécurisé
}
```

### ❌ Frontend
```typescript
// MAUVAIS : Pas de gestion d'erreur
const createCircle = async () => {
    const tx = await sendTransaction(...);
    // ❌ Et si ça échoue ?
};

// BON : Try/catch
const createCircle = async () => {
    try {
        const tx = await sendTransaction(...);
        toast.success("Circle created!");
    } catch (error) {
        toast.error("Failed: " + error.message);
        console.error(error);
    }
};
```

---

## 📞 Besoin d'Aide ?

**Je suis là pour vous aider !**

Continuez à me poser des questions sur :
- Architecture technique
- Debugging de code
- Meilleures pratiques
- Stratégie projet
- Tout ce qui concerne xCircle DAO !

**Commandes utiles à me demander** :
- "Aide-moi à écrire les tests pour CircleManager"
- "Comment déployer sur Devnet étape par étape ?"
- "Crée-moi le composant React pour créer un cercle"
- "Explique-moi comment fonctionne le staking"
- "Aide-moi à préparer le pitch deck pour les grants"

---

## 🎯 Action Immédiate (Aujourd'hui)

**Faites ces 3 choses maintenant** :

1. **Créer le repository GitHub**
   ```bash
   git init
   git add .
   git commit -m "🎉 Initial commit"
   # Puis suivre instructions GitHub
   ```

2. **Tester la compilation du smart contract**
   ```bash
   cd contracts/circle-manager
   mxpy contract build
   # Si ça marche → ✅ Vous êtes prêt !
   ```

3. **Planifier votre semaine**
   - Choisir 2-3 tâches de la Semaine 3-4
   - Créer des issues GitHub
   - Bloquer du temps dans votre agenda

---

**Bonne chance avec xCircle DAO ! Vous avez une base solide pour réussir. 🚀**

*Dernière mise à jour : Octobre 2024*
