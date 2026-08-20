"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const MonitorAuthContext = createContext(null);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function getMonitorAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/invalid-credential") return "The email or password is incorrect.";
  if (code === "auth/too-many-requests") return "Too many sign-in attempts. Wait a moment and try again.";
  if (code === "auth/popup-closed-by-user") return "The Google sign-in window was closed before completion.";
  if (code === "auth/popup-blocked") return "Your browser blocked the Google sign-in window. Allow popups and try again.";
  if (code === "auth/unauthorized-domain") return "This monitor domain is not authorised in Firebase Authentication.";
  if (code === "auth/operation-not-allowed") return "This sign-in method is not enabled in Firebase Authentication.";
  if (code === "auth/network-request-failed") return "Firebase could not be reached. Check your connection and try again.";
  return error?.message || "Sign-in failed. Please try again.";
}

export function MonitorAuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;
      setLoading(true);
      setProfileError("");
      setFirebaseUser(currentUser);
      setProfile(null);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const profileSnapshot = await getDoc(doc(db, "users", currentUser.uid));
        if (!active) return;
        if (!profileSnapshot.exists()) {
          setProfileError("This account does not have a Contextra user profile.");
        } else {
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: currentUser.displayName || "",
            photoURL: currentUser.photoURL || "",
            ...profileSnapshot.data(),
          });
        }
      } catch (error) {
        console.error("Monitor administrator profile check failed:", error);
        if (active) setProfileError("Administrator access could not be verified. Try signing in again.");
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    firebaseUser,
    profile,
    loading,
    profileError,
    isAdmin: profile?.role === "admin",
    signInWithEmail: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signInWithGoogle: () => signInWithPopup(auth, googleProvider),
    logout: () => signOut(auth),
  }), [firebaseUser, profile, loading, profileError]);

  return <MonitorAuthContext.Provider value={value}>{children}</MonitorAuthContext.Provider>;
}

export function useMonitorAuth() {
  const context = useContext(MonitorAuthContext);
  if (!context) throw new Error("useMonitorAuth must be used inside MonitorAuthProvider");
  return context;
}
