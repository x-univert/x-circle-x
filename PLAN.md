# Plan d'Implémentation : Chat & Forum

## Vue d'ensemble

Ajouter un système de Chat en temps réel pour les membres du Cercle de Vie et un Forum de discussion dans l'onglet DAO, utilisant Firebase comme backend.

---

## Phase 1 : Setup Firebase

### 1.1 Créer le projet Firebase
- Aller sur https://console.firebase.google.com
- Créer un nouveau projet "xcirclex-chat"
- Activer Firestore Database
- Activer Authentication (Anonymous + Custom Token)

### 1.2 Installer les dépendances
```bash
cd frontend
npm install firebase
```

### 1.3 Configuration Firebase
Créer `frontend/src/config/firebase.ts` :
```typescript
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
```

---

## Phase 2 : Onglet Chat (Cercle de Vie)

### 2.1 Structure Firestore
```
/circles/{circleId}/
  /channels/
    - general (doc)
    - aide (doc)
    - announcements (doc)
  /messages/{channelId}/
    - {messageId}: { sender, senderAddress, content, timestamp }
  /privateMessages/{conversationId}/
    - {messageId}: { sender, receiver, content, timestamp }
```

### 2.2 Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `components/tabs/ChatTab.tsx` | Composant principal du chat |
| `components/chat/ChannelList.tsx` | Liste des canaux (général, aide, etc.) |
| `components/chat/MessageList.tsx` | Affichage des messages |
| `components/chat/MessageInput.tsx` | Champ de saisie |
| `components/chat/PrivateMessages.tsx` | Messages privés |
| `components/chat/UserList.tsx` | Liste des membres en ligne |
| `services/chatService.ts` | Service Firebase pour le chat |
| `hooks/useChat.ts` | Hook React pour le chat |

### 2.3 Fonctionnalités Chat
- [x] Chat général - tous les membres
- [x] Canaux thématiques (général, aide, announcements)
- [x] Messages privés entre membres
- [ ] Indicateur de présence (en ligne/hors ligne)
- [ ] Notifications de nouveaux messages

### 2.4 Sécurité
- Vérifier que l'utilisateur a rejoint le cercle avant d'autoriser le chat
- Utiliser l'adresse MultiversX comme identifiant unique
- Règles Firestore pour limiter l'accès aux membres

---

## Phase 3 : Forum dans DAO

### 3.1 Structure Firestore
```
/dao/
  /topics/
    - {topicId}: { title, author, authorAddress, content, createdAt, category, votes }
  /comments/{topicId}/
    - {commentId}: { author, authorAddress, content, createdAt, votes }
```

### 3.2 Modifications DaoTab.tsx
Ajouter une section Forum avec :
- Liste des sujets de discussion
- Création de nouveau sujet
- Commentaires sur les sujets
- Système de votes (upvote/downvote)

### 3.3 Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `components/forum/TopicList.tsx` | Liste des sujets |
| `components/forum/TopicDetail.tsx` | Détail d'un sujet + commentaires |
| `components/forum/CreateTopic.tsx` | Modal création de sujet |
| `components/forum/CommentSection.tsx` | Section commentaires |
| `services/forumService.ts` | Service Firebase pour le forum |
| `hooks/useForum.ts` | Hook React pour le forum |

---

## Phase 4 : Authentification MultiversX ↔ Firebase

### 4.1 Flow d'authentification
1. L'utilisateur se connecte avec son wallet MultiversX
2. On génère un message signé avec l'adresse
3. On utilise Firebase Custom Auth avec l'adresse comme UID
4. Firebase vérifie et autorise l'accès

### 4.2 Code d'authentification
```typescript
// Authentification avec adresse MultiversX
const signInWithMultiversX = async (address: string) => {
  // Utiliser signInAnonymously puis mettre à jour le profil
  // Ou créer un backend pour générer des custom tokens
  await signInAnonymously(auth)
  // Stocker l'adresse dans le profil utilisateur Firestore
}
```

---

## Phase 5 : Intégration UI

### 5.1 Ajouter l'onglet Chat
1. Modifier `CircleNavTabs.tsx` : ajouter `'chat'` au type `TabId`
2. Modifier `CircleOfLife.tsx` : ajouter le lazy loading et le rendu

### 5.2 Traductions
Ajouter les clés dans `fr/translation.json`, `en/translation.json`, `es/translation.json`

---

## Estimation des fichiers

| Nouveaux fichiers | ~12 |
|-------------------|-----|
| Fichiers modifiés | ~6 |

**Fichiers modifiés :**
- `frontend/src/components/CircleNavTabs.tsx`
- `frontend/src/pages/CircleOfLife.tsx`
- `frontend/src/components/tabs/DaoTab.tsx`
- `frontend/src/locales/*/translation.json` (3 fichiers)

---

## Prérequis utilisateur

1. Créer un projet Firebase (gratuit)
2. Copier les credentials dans `.env.local`
3. Configurer les règles Firestore

---

## Questions en suspens

1. **Modération** : Voulez-vous un système de modération pour le chat/forum ?
2. **Notifications** : Push notifications pour les nouveaux messages ?
3. **Stockage images** : Permettre le partage d'images dans le chat ?
