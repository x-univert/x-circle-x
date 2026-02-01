import { initializeApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'
import { getStorage, FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let storage: FirebaseStorage | null = null

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  )
}

// Check if Firebase Storage is configured
export const isStorageConfigured = (): boolean => {
  const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
  const isConfigured = !!(bucket && bucket.length > 0 && bucket !== 'undefined')
  if (!isConfigured) {
    console.warn('Firebase Storage not configured. VITE_FIREBASE_STORAGE_BUCKET is missing or empty.')
  }
  return isConfigured
}

// Initialize Firebase only if configured
export const initializeFirebase = (): { app: FirebaseApp; db: Firestore; auth: Auth; storage: FirebaseStorage } | null => {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase is not configured. Chat and Forum features will be disabled.')
    return null
  }

  if (!app) {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)
    storage = getStorage(app)
  }

  return { app, db: db!, auth: auth!, storage: storage! }
}

// Get Firebase instances
export const getFirebaseApp = () => app
export const getFirebaseDb = () => db
export const getFirebaseAuth = () => auth
export const getFirebaseStorage = () => storage

// Export for convenience
export { app, db, auth, storage }
