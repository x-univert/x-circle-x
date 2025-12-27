# xCircle DAO - Frontend dApp

Application web décentralisée pour xCircle DAO, construite avec React, TypeScript, Vite et MultiversX SDK.

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+ et npm
- Un wallet MultiversX (xPortal, Web Wallet, ou Extension)

### Installation

```bash
cd dapp
npm install
```

### Lancer en mode développement

```bash
npm run dev
```

### Build pour production

```bash
npm run build
```

Les fichiers de production seront dans le dossier `dist/`

## 📁 Structure du Projet

```
dapp/
├── src/
│   ├── components/      # Composants React réutilisables
│   ├── pages/           # Pages de l'application
│   │   └── Home.tsx     # Page d'accueil avec connexion wallet
│   ├── hooks/           # React hooks personnalisés
│   ├── services/        # Services (API, blockchain)
│   ├── utils/           # Fonctions utilitaires
│   ├── App.tsx          # Composant principal
│   ├── main.tsx         # Point d'entrée
│   └── index.css        # Styles globaux
├── public/              # Assets statiques
├── index.html           # Template HTML
├── package.json         # Dépendances
├── vite.config.ts       # Configuration Vite
├── tsconfig.json        # Configuration TypeScript
└── tailwind.config.js   # Configuration Tailwind CSS
```

## 🛠️ Technologies

### Core

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool ultra-rapide

### MultiversX

- **@multiversx/sdk-dapp** - Intégration wallet et transactions
- **@multiversx/sdk-core** - Fonctionnalités blockchain core
- **@multiversx/sdk-network-providers** - Providers réseau
- **@multiversx/sdk-wallet** - Gestion wallet

### Styling

- **Tailwind CSS** - Utility-first CSS
- **PostCSS** - Transformations CSS
- **Autoprefixer** - Préfixes CSS automatiques

### Routing

- **React Router v6** - Routing côté client

### State Management

- **Zustand** - State management léger (à implémenter)

## 🔗 Fonctionnalités Actuelles

### ✅ Implémenté

- [X] Connexion wallet (xPortal, Web Wallet, Extension)
- [X] Déconnexion
- [X] Page d'accueil responsive
- [X] Design system avec Tailwind
- [X] Configuration MultiversX Devnet

### 🚧 En Cours

- [ ] Liste des cercles disponibles
- [ ] Création de cercle
- [ ] Dashboard utilisateur
- [ ] Vote pour membres
- [ ] Contributions
- [ ] Historique transactions

## 🌐 Configuration Réseau

Par défaut, l'application est configurée pour **Devnet**.

Pour changer de réseau, modifiez dans `src/App.tsx` :

```typescript
const environment = 'devnet' // ou 'testnet' ou 'mainnet'
```

## 📝 Scripts Disponibles

```bash
# Développement
npm run dev

# Build production
npm run build

# Preview build production
npm run preview

# Linting
npm run lint
```

## 🎨 Customisation

### Couleurs et Thème

Modifiez `tailwind.config.js` pour personnaliser les couleurs :

```javascript
theme: {
  extend: {
    colors: {
      primary: '#...',
      secondary: '#...',
    }
  }
}
```

### Configuration MultiversX

Modifiez les paramètres dans `src/App.tsx` :

```typescript
<DappProvider
  environment={environment}
  customNetworkConfig={{
    name: 'customConfig',
    apiTimeout: 6000,
    walletConnectV2ProjectId: 'YOUR_PROJECT_ID'
  }}
>
```

## 🔐 Sécurité

- ✅ Aucune clé privée stockée côté client
- ✅ Toutes les transactions signées via wallet
- ✅ Communications HTTPS uniquement
- ✅ Variables d'environnement pour données sensibles

## 🐛 Troubleshooting

### Erreur de connexion wallet

Vérifiez que :

1. Votre wallet est sur le bon réseau (Devnet/Testnet/Mainnet)
2. L'extension wallet est installée et activée
3. Vous avez accepté les permissions dans le wallet

### Erreur npm install

```bash
# Nettoyer le cache et réinstaller
rm -rf node_modules package-lock.json
npm install
```

## 📚 Documentation

- [MultiversX Docs](https://docs.multiversx.com/)
- [SDK dApp Docs](https://www.npmjs.com/package/@multiversx/sdk-dapp)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind Docs](https://tailwindcss.com/)

## 🤝 Contribuer

Consultez [CONTRIBUTING.md](../CONTRIBUTING.md) à la racine du projet.

## 📄 License

MIT - Voir [LICENSE](../LICENSE)

---

**Construit avec ❤️ pour la communauté MultiversX**
