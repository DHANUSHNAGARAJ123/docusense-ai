// frontend/src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBWihPXNkqoF7N5W6nxiEfCHK3n_66RBEo",
  authDomain: "multimodal-document-system.firebaseapp.com",
  databaseURL: "https://multimodal-document-system-default-rtdb.firebaseio.com",
  projectId: "multimodal-document-system",
  storageBucket: "multimodal-document-system.firebasestorage.app",
  messagingSenderId: "770284787669",
  appId: "1:770284787669:web:cb6717ed5b85d6e91ccf5c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// ─── Auth ────────────────────────────────────────────
export const registerUser = async (email: string, password: string, name: string): Promise<User> => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await set(ref(db, `users/${cred.user.uid}`), {
    uid: cred.user.uid,
    name,
    email,
    createdAt: new Date().toISOString(),
  });
  return cred.user;
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const logoutUser = () => signOut(auth);

// ─── Session (localStorage) ──────────────────────────
const SESSION_KEY = 'docusense_session';

export interface SessionData {
  uid: string;
  email: string;
  name: string;
}

export const saveSession = (user: User): void => {
  const data: SessionData = {
    uid: user.uid,
    email: user.email || '',
    name: user.displayName || user.email?.split('@')[0] || 'User',
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
};

export const getSession = (): SessionData | null => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

// ─── Firebase DB helpers (user-scoped) ───────────────
export const saveDocumentToFirebase = async (uid: string, docData: any) => {
  await set(ref(db, `documents/${uid}/${docData.id}`), {
    ...docData,
    userId: uid,
    savedAt: new Date().toISOString(),
  });
};

export const getUserDocuments = async (uid: string): Promise<any[]> => {
  const snap = await get(ref(db, `documents/${uid}`));
  if (!snap.exists()) return [];
  return Object.values(snap.val());
};

export const saveExtractionToFirebase = async (uid: string, docId: string, data: any) => {
  await set(ref(db, `extractions/${uid}/${docId}`), {
    ...data,
    userId: uid,
    savedAt: new Date().toISOString(),
  });
};

export const getExtractionFromFirebase = async (uid: string, docId: string): Promise<any | null> => {
  const snap = await get(ref(db, `extractions/${uid}/${docId}`));
  return snap.exists() ? snap.val() : null;
};

export const deleteDocumentFromFirebase = async (uid: string, docId: string) => {
  await remove(ref(db, `documents/${uid}/${docId}`));
  await remove(ref(db, `extractions/${uid}/${docId}`));
};