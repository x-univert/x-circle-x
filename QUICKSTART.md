# 🚀 xCircle DAO - Démarrage Rapide

## ✨ Ce qui fonctionne maintenant

### Smart Contract ✅
- **Déployé sur Devnet** (18 octobre 2025)
- Adresse : `erd1qqqqqqqqqqqqqpgqdsewrr7l90whfvrf7lmy2zg3de3aezfuflfq60y9hd`
- [Voir sur Explorer](https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqdsewrr7l90whfvrf7lmy2zg3de3aezfuflfq60y9hd)
- Transaction de déploiement : [8c3349dd...](https://devnet-explorer.multiversx.com/transactions/8c3349dd9679c2cc4a278c973e547484734775d82b3773e618f8bbd4badc1d16)

### Frontend ✅
- **Application React connectée** au smart contract
- Création de cercles fonctionnelle
- Transactions réelles sur la blockchain

## 🎮 Tester Maintenant

### 1. Lancer l'Application

```bash
cd dapp
npm run dev
```

Ouvrez : **http://localhost:3001**

### 2. Connecter Votre Wallet

1. Cliquez sur un des boutons de connexion :
   - MultiversX DeFi Wallet (extension)
   - MultiversX Web Wallet (navigateur)
   - xPortal App (mobile via QR code)

2. Assurez-vous d'être sur **Devnet**

3. Avoir au moins **1 EGLD** pour les tests

### 3. Créer Votre Premier Cercle

1. Cliquez sur **"Cercles"** → **"Créer un Cercle"**

2. Remplissez :
   - Nom : "Mon Premier Cercle"
   - Description : "Test sur Devnet"
   - Contribution : 1 EGLD
   - Fréquence : Mensuel
   - Membres : 5
   - Durée : 5 mois

3. Cliquez sur **"Créer le Cercle"**

4. **Signez la transaction** dans votre wallet

5. Attendez la confirmation (quelques secondes)

6. ✅ Votre cercle est créé sur la blockchain !

## 📊 Vérifier Votre Transaction

Après la création, vous pouvez :

1. **Sur l'application** : Voir la confirmation
2. **Sur Explorer** : Vérifier la transaction sur https://devnet-explorer.multiversx.com
3. **Dans votre wallet** : Voir la transaction dans l'historique

## 🔍 Structure des Fichiers Importants

```
📁 dapp/src/
  ├── config/contracts.ts          # Adresse du contrat
  ├── services/circleService.ts    # Fonctions pour interagir avec le contrat
  ├── hooks/useCircleContract.ts   # Hook React pour les composants
  ├── types/circle.ts              # Types TypeScript
  └── pages/CreateCircle.tsx       # Page de création (connectée)
```

## 💡 Exemples d'Utilisation

### Dans un Composant React

```typescript
import { useCircleContract } from '../hooks/useCircleContract'

function MyComponent() {
  const { createCircle, isLoading, error } = useCircleContract()

  const handleCreate = async () => {
    const sessionId = await createCircle({
      contributionAmount: '1.0',  // en EGLD
      cycleDuration: 2592000,      // 30 jours en secondes
      maxMembers: 5
    })

    if (sessionId) {
      console.log('Transaction envoyée!')
    }
  }

  return (
    <button onClick={handleCreate} disabled={isLoading}>
      {isLoading ? 'Création...' : 'Créer un Cercle'}
    </button>
  )
}
```

## 🐛 Problèmes Courants

### "Wallet not connected"
→ Assurez-vous d'être connecté avec votre wallet avant d'effectuer des transactions

### "Insufficient funds"
→ Votre wallet doit avoir assez d'EGLD pour :
  - Le montant de la transaction
  - Les frais de gas (~0.0006 EGLD)

### "Transaction failed"
→ Vérifiez les logs dans la console (F12) pour plus de détails

### L'application ne se lance pas
```bash
cd dapp
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📚 Documentation Complète

- **README_INTEGRATION.md** : Documentation technique complète
- **DEPLOY_INSTRUCTIONS.md** : Instructions de déploiement du contrat
- **contracts/circle-manager/README.md** : Documentation du smart contract

## 🎯 Prochaines Fonctionnalités à Développer

1. **Afficher la liste des cercles existants**
   - Requêter tous les cercles depuis le contrat
   - Afficher les détails de chaque cercle

2. **Rejoindre un cercle**
   - Demander l'adhésion
   - Voter pour des candidats

3. **Contribuer à un cercle**
   - Envoyer sa contribution mensuelle
   - Voir l'historique

4. **Dashboard utilisateur**
   - Voir mes cercles
   - Mes contributions
   - Mes gains

## 💬 Besoin d'Aide ?

- **Smart Contract** : Voir `contracts/circle-manager/src/lib.rs`
- **Services** : Voir `dapp/src/services/circleService.ts`
- **Types** : Voir `dapp/src/types/circle.ts`

---

**🎉 Félicitations ! Votre MVP est fonctionnel !**

Vous pouvez maintenant créer des cercles d'épargne sur la blockchain MultiversX.

*Prochaine étape : Implémenter les autres pages pour une expérience complète.*
