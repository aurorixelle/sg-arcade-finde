import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db, firebaseReady } from "../firebase.js";
import { SITE_URL } from "../firebase-config.js";

const AuthContext = createContext(null);

const ACTION_CODE_SETTINGS = { url: SITE_URL, handleCodeInApp: false };

function friendlyAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect";
    case "auth/email-already-in-use":
      return "Email already registered";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/invalid-email":
      return "Invalid email address";
    case "auth/too-many-requests":
      return "Too many attempts — try again later";
    case "auth/network-request-failed":
      return "Network error — check your connection";
    default:
      return error?.message?.replace("Firebase: ", "") || "Unknown error";
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // Firebase Auth user
  const [profile, setProfile] = useState(null);  // users/{uid} doc: { email, admin?, favorites }
  const [loading, setLoading] = useState(firebaseReady);

  // Auth state + user profile document subscription
  useEffect(() => {
    if (!firebaseReady) return undefined;
    let unsubProfile = () => {};
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      unsubProfile();
      if (u) {
        // create profile doc on first login/registration, then subscribe live
        (async () => {
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref).catch(() => null);
          if (snap && !snap.exists()) {
            await setDoc(ref, { email: u.email, favorites: [] }).catch(() => {});
          }
        })();
        unsubProfile = onSnapshot(
          doc(db, "users", u.uid),
          (d) => setProfile(d.exists() ? d.data() : null),
          () => setProfile(null)
        );
      } else {
        setProfile(null);
      }
    });
    return () => {
      unsubAuth();
      unsubProfile();
    };
  }, []);

  async function signUp(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), { email, favorites: [] });
    await sendEmailVerification(cred.user, ACTION_CODE_SETTINGS);
    return cred.user;
  }

  async function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email, ACTION_CODE_SETTINGS);
  }

  async function resendVerification() {
    if (user) await sendEmailVerification(user, ACTION_CODE_SETTINGS);
  }

  async function refreshUser() {
    if (user) await user.reload(); // picks up emailVerified after clicking the email link
    setUser({ ...user });          // trigger re-render with fresh emailVerified
  }

  async function signOut() {
    return fbSignOut(auth);
  }

  const favorites = Array.isArray(profile?.favorites) ? profile.favorites : [];
  const isAdmin = profile?.admin === true;
  const verified = user?.emailVerified === true;

  async function toggleFavorite(arcadeId) {
    if (!user || !verified || !db) return;
    const ref = doc(db, "users", user.uid);
    const next = favorites.includes(arcadeId)
      ? favorites.filter((f) => f !== arcadeId)
      : [...favorites, arcadeId];
    await updateDoc(ref, { favorites: next });
  }

  const value = {
    firebaseReady,
    user,
    profile,
    loading,
    isAdmin,
    verified,
    favorites,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendVerification,
    refreshUser,
    toggleFavorite,
    friendlyAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
