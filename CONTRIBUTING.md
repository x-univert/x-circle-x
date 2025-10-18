# Guide de Contribution - xCircle DAO

Merci de votre intérêt pour contribuer à xCircle DAO ! 🎉

Ce guide vous aidera à démarrer, que vous soyez développeur, designer, rédacteur ou simplement passionné par le projet.

---

## 📋 Table des matières

1. [Code de conduite](#code-de-conduite)
2. [Comment contribuer](#comment-contribuer)
3. [Configuration de l'environnement](#configuration-de-lenvironnement)
4. [Structure du projet](#structure-du-projet)
5. [Standards de code](#standards-de-code)
6. [Process de Pull Request](#process-de-pull-request)
7. [Système de récompenses](#système-de-récompenses)
8. [Communauté](#communauté)

---

## Code de conduite

### Nos engagements

xCircle DAO s'engage à fournir un environnement accueillant et inclusif pour tous. Nous attendons de tous les contributeurs qu'ils :

✅ Soient respectueux et professionnels
✅ Acceptent les critiques constructives
✅ Se concentrent sur ce qui est meilleur pour la communauté
✅ Fassent preuve d'empathie envers les autres membres

❌ Nous ne tolérons pas :
- Harcèlement ou discrimination
- Trolling ou commentaires insultants
- Attaques personnelles ou politiques
- Publication d'informations privées sans consentement

### Application

Les violations du code de conduite peuvent être signalées à [email à définir]. Toutes les plaintes seront examinées et traitées de manière confidentielle.

---

## Comment contribuer

### Types de contributions recherchées

#### 👨‍💻 Développement
- **Smart Contracts** (Rust/MultiversX)
- **Frontend** (React/TypeScript)
- **Backend** (Node.js ou Rust)
- **Tests** automatisés
- **Optimisations** de performance

#### 🎨 Design
- **UI/UX** design
- **Illustrations** et **icônes**
- **Animations** et **interactions**
- **Branding** (logo, charte graphique)

#### 📝 Documentation
- **Guides utilisateurs** (en français et anglais)
- **Tutoriels** techniques
- **Traductions**
- **Amélioration** de la doc existante

#### 🧪 Testing & QA
- **Tests manuels**
- **Rapports de bugs**
- **Suggestions** d'amélioration
- **Tests de sécurité**

#### 💡 Idées & Propositions
- **Nouvelles fonctionnalités**
- **Améliorations** d'expérience
- **Stratégies** marketing
- **Partenariats** potentiels

---

## Configuration de l'environnement

### Prérequis

**Termes techniques** :
- **IDE** = Integrated Development Environment (environnement de développement)
- **CLI** = Command Line Interface (interface en ligne de commande)
- **Repository** = Dépôt de code (repo)

#### Pour le développement Smart Contracts :
```bash
# Installer Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Installer mxpy (MultiversX CLI)
pip3 install multiversx-sdk-cli --upgrade

# Vérifier l'installation
mxpy --version
rustc --version
```

#### Pour le développement Frontend :
```bash
# Installer Node.js (version 18+)
# Télécharger depuis : https://nodejs.org

# Vérifier l'installation
node --version
npm --version

# Installer pnpm (gestionnaire de paquets rapide)
npm install -g pnpm
```

### Cloner le repository

```bash
# Cloner via HTTPS
git clone https://github.com/[username]/xcircle-dao.git

# OU via SSH (recommandé si configuré)
git clone git@github.com:[username]/xcircle-dao.git

# Entrer dans le dossier
cd xcircle-dao
```

### Installation des dépendances

#### Smart Contracts :
```bash
cd contracts/circle-manager
# Les dépendances Rust sont gérées via Cargo.toml
# Compiler pour tester
mxpy contract build
```

#### Frontend dApp :
```bash
cd dapp
pnpm install
pnpm dev  # Lance le serveur de développement
```

#### Backend (optionnel) :
```bash
cd backend
pnpm install
pnpm dev
```

---

## Structure du projet

```
xcircle-dao/
├── contracts/              # Smart contracts MultiversX (Rust)
│   ├── circle-manager/    # Gestion des cercles
│   ├── token/             # Token $XCIRCLE
│   ├── nft/               # NFT de réputation
│   ├── governance/        # Système DAO
│   └── treasury/          # Trésorerie
│
├── dapp/                   # Application web (React)
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/         # Pages principales
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API et blockchain
│   │   ├── utils/         # Fonctions utilitaires
│   │   └── config/        # Configuration
│   ├── public/            # Assets statiques
│   └── package.json
│
├── backend/               # API optionnelle
│   └── src/
│
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── USER_GUIDE.md
│   └── SECURITY.md
│
├── scripts/               # Scripts d'automatisation
│   ├── deploy.sh         # Déploiement contracts
│   └── test.sh           # Tests automatisés
│
├── tests/                 # Tests end-to-end
│
├── .github/               # Configuration GitHub
│   ├── workflows/        # CI/CD
│   └── ISSUE_TEMPLATE/
│
├── README.md
├── WHITEPAPER.md
├── CONTRIBUTING.md        # Ce fichier
└── LICENSE
```

---

## Standards de code

### Smart Contracts (Rust)

#### Conventions de nommage :
```rust
// ✅ BON
pub struct Circle {
    id: u64,
    members: ManagedVec<ManagedAddress>,
}

#[endpoint(createCircle)]
fn create_circle(&self, amount: BigUint) -> u64 {
    // ...
}

// ❌ MAUVAIS
pub struct circle {
    Id: u64,
}

fn CreateCircle() { }
```

#### Règles :
- **Structs** : PascalCase
- **Functions/variables** : snake_case
- **Constants** : SCREAMING_SNAKE_CASE
- **Endpoints** : camelCase (pour compatibilité JS)

#### Documentation :
```rust
/// Crée un nouveau cercle d'épargne rotative
///
/// # Arguments
/// * `contribution_amount` - Montant par cycle en EGLD
/// * `cycle_duration` - Durée d'un cycle en secondes
/// * `max_members` - Nombre maximum de membres
///
/// # Returns
/// L'ID unique du cercle créé
#[endpoint(createCircle)]
fn create_circle(
    &self,
    contribution_amount: BigUint,
    cycle_duration: u64,
    max_members: u32
) -> u64 {
    // Implementation
}
```

#### Tests requis :
```rust
#[test]
fn test_create_circle_success() {
    // Test du cas nominal
}

#[test]
fn test_create_circle_invalid_amount() {
    // Test des cas d'erreur
}
```

**Coverage minimum : 80%**

### Frontend (React/TypeScript)

#### Conventions de nommage :
```typescript
// ✅ BON
const CircleCard: React.FC<CircleCardProps> = ({ circle }) => {
  const { createCircle } = useCircleManager();

  return <div className="circle-card">...</div>;
};

// ❌ MAUVAIS
const circlecard = (props: any) => {
  return <div>...</div>;
};
```

#### Règles :
- **Components** : PascalCase
- **Hooks** : use + PascalCase (ex: useCircleManager)
- **Variables/functions** : camelCase
- **Constants** : SCREAMING_SNAKE_CASE
- **Files** : kebab-case.tsx

#### Structure de composant :
```typescript
interface CircleCardProps {
  circle: Circle;
  onJoin?: () => void;
}

export const CircleCard: React.FC<CircleCardProps> = ({
  circle,
  onJoin
}) => {
  // 1. Hooks
  const { address } = useGetAccount();
  const [isLoading, setIsLoading] = useState(false);

  // 2. Functions
  const handleJoin = async () => {
    setIsLoading(true);
    try {
      await onJoin?.();
    } catch (error) {
      console.error('Join failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Render
  return (
    <div className="circle-card">
      <h3>{circle.name}</h3>
      <button onClick={handleJoin} disabled={isLoading}>
        {isLoading ? 'Joining...' : 'Join Circle'}
      </button>
    </div>
  );
};
```

#### Styling :
- Utiliser **TailwindCSS** en priorité
- Classes utilitaires pour composants simples
- CSS Modules pour composants complexes

```tsx
// ✅ BON - TailwindCSS
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-900">Title</h2>
</div>

// ✅ BON - CSS Module pour logique complexe
import styles from './CircleCard.module.css';

<div className={styles.card}>
  <h2 className={styles.title}>Title</h2>
</div>
```

### Git Workflow

#### Branches :
```bash
main            # Production (protégée)
├── develop     # Développement (défaut)
├── feature/nom-fonctionnalite
├── fix/nom-bug
└── docs/nom-documentation
```

#### Nommage des branches :
- `feature/circle-creation` - Nouvelle fonctionnalité
- `fix/contribution-bug` - Correction de bug
- `docs/smart-contract-guide` - Documentation
- `refactor/clean-code` - Refactoring
- `test/circle-manager` - Ajout de tests

#### Commits :
Format : **type(scope): description**

```bash
# ✅ BON
feat(circle): add automatic distribution logic
fix(nft): resolve metadata update issue
docs(readme): update installation instructions
test(token): add staking reward tests

# ❌ MAUVAIS
update code
fix bug
WIP
```

**Types de commit** :
- `feat` - Nouvelle fonctionnalité
- `fix` - Correction de bug
- `docs` - Documentation
- `style` - Formatage (pas de changement de code)
- `refactor` - Refactoring
- `test` - Ajout de tests
- `chore` - Tâches de maintenance

---

## Process de Pull Request

### 1. Créer une branche

```bash
# Depuis develop
git checkout develop
git pull origin develop

# Créer votre branche
git checkout -b feature/ma-super-fonctionnalite
```

### 2. Développer

```bash
# Faire vos modifications
# ...

# Ajouter les fichiers
git add .

# Commiter avec message descriptif
git commit -m "feat(circle): add member voting system"

# Pusher votre branche
git push origin feature/ma-super-fonctionnalite
```

### 3. Ouvrir une Pull Request

Sur GitHub :
1. Aller dans **Pull Requests** > **New Pull Request**
2. Base: `develop` ← Compare: `feature/ma-super-fonctionnalite`
3. Remplir le template :

```markdown
## Description
Brève description de la fonctionnalité/fix

## Type de changement
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix ou feature qui casse compatibilité)
- [ ] Documentation

## Checklist
- [ ] Mon code suit les standards du projet
- [ ] J'ai commenté les parties complexes
- [ ] J'ai mis à jour la documentation
- [ ] J'ai ajouté des tests qui passent
- [ ] Les tests existants passent toujours
- [ ] J'ai testé localement

## Screenshots (si UI)
[Ajouter captures d'écran]

## Tests effectués
- Test 1 : ...
- Test 2 : ...
```

### 4. Review

- Au moins **1 reviewer** requis
- Toutes les **discussions** doivent être résolues
- Les **tests CI/CD** doivent passer
- Pas de **conflits** avec develop

### 5. Merge

Une fois approuvée :
- Le mainteneur mergera votre PR
- Votre branche sera automatiquement supprimée
- Vous serez ajouté aux contributeurs ! 🎉

---

## Système de récompenses

### 🎁 Bounties (Primes)

Nous offrons des récompenses pour certaines contributions :

#### Issues avec bounties :
- 🟢 **Facile** (10-50 $XCIRCLE) : Bugs mineurs, docs
- 🟡 **Moyen** (50-200 $XCIRCLE) : Features simples, tests
- 🔴 **Difficile** (200-1000 $XCIRCLE) : Features complexes, sécurité
- ⚫ **Critique** (1000+ $XCIRCLE) : Vulnérabilités, optimisations majeures

#### Comment recevoir un bounty :
1. Chercher les issues avec label `bounty`
2. Commenter "I'd like to work on this"
3. Soumettre une PR de qualité
4. Une fois mergée, recevoir les tokens !

### 🏆 Programme contributeurs

#### Niveaux :
- **Bronze** (1-5 PRs) : Mention dans README
- **Silver** (6-15 PRs) : NFT contributeur + 100 $XCIRCLE
- **Gold** (16-30 PRs) : NFT spécial + 500 $XCIRCLE + rôle Discord
- **Platinum** (31+ PRs) : NFT rare + 2000 $XCIRCLE + Core Contributor status

#### Avantages Core Contributors :
- 🗳️ Droit de vote renforcé (x2)
- 💰 Share des frais de protocole
- 🎤 Accès aux décisions stratégiques
- 📢 Reconnaissance publique

---

## Communauté

### 💬 Où discuter ?

- **Discord** : [À créer] - Discussion générale, support
- **GitHub Discussions** : Propositions, débats techniques
- **Twitter/X** : [À créer] - Annonces, news
- **Telegram** : [À créer] - Communauté francophone

### 📅 Réunions

- **Dev Sync** : Tous les lundis, 18h CET (Discord)
- **Community Call** : 1er vendredi du mois, 19h CET (Discord)
- **Workshops** : Annoncés sur Discord

### 🆘 Besoin d'aide ?

1. **FAQ** : Consultez la documentation
2. **Discord #dev-help** : Questions techniques
3. **GitHub Issues** : Problèmes ou bugs
4. **Email** : [À définir] pour questions privées

---

## Questions fréquentes

### Je ne sais pas coder, puis-je contribuer ?
**Oui !** Nous avons besoin de :
- Traducteurs
- Rédacteurs (documentation)
- Designers
- Community managers
- Testeurs

### Je débute en blockchain, c'est OK ?
**Absolument !** Nous sommes là pour vous aider :
- Documentation pour débutants
- Mentorat disponible
- Issues `good-first-issue` pour commencer

### Quand recevrai-je mes récompenses ?
- **Bounties** : Après merge de la PR (sous 7 jours)
- **Contributor NFTs** : Distribués mensuellement
- **Tokens $XCIRCLE** : Selon vesting (après IDO)

### Puis-je travailler sur quelque chose sans issue ?
Oui, mais **ouv rez d'abord une issue** pour discussion :
- Expliquez votre idée
- Attendez feedback de l'équipe
- Puis développez si approuvé

Cela évite le travail inutile !

---

## Licence

En contribuant, vous acceptez que vos contributions soient sous licence **MIT** (même que le projet).

---

## Remerciements

Merci à tous nos contributeurs ! ❤️

[Liste des contributeurs sera générée automatiquement]

---

**Prêt à contribuer ? Consultez les [issues ouvertes](../../issues) et lancez-vous !** 🚀

*Pour toute question : [Discord] ou [email]*
