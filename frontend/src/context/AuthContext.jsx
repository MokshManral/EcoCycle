import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL;

const DEMO_ACCOUNTS = {
  citizen: {
    email: "citizen@ecocycle.demo",
    password: "citizen123",
    role: "citizen",
    display_name: "Demo Citizen",
  },
  collector: {
    email: "collector@ecocycle.demo",
    password: "collector123",
    role: "collector",
    display_name: "Demo Collector",
  },
  admin: {
    email: "admin@ecocycle.demo",
    password: "admin123",
    role: "admin",
    display_name: "Demo Admin",
  },
};

function getDemoProfile(email) {
  const trimmed = (email || "").trim().toLowerCase();
  const match = Object.values(DEMO_ACCOUNTS).find((account) => account.email.toLowerCase() === trimmed);
  return match ? { ...match } : null;
}

async function fetchProfile(firebaseUser, forceRefresh = false) {
  const token = await firebaseUser.getIdToken(forceRefresh);

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "Your account has no assigned role. Contact an administrator."
        : "Unable to load your account."
    );
  }

  return response.json();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      setLoading(true);
      setUser(firebaseUser);
      setProfile(null);

      try {
        if (firebaseUser) {
          const data = await fetchProfile(firebaseUser);
          if (active) setProfile(data);
        }
      } catch (error) {
        console.error("Profile loading failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function signup(email, password, displayName) {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    try {
      const token = await credential.user.getIdToken();

      const response = await fetch(`${API_URL}/auth/register-citizen`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ display_name: displayName }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // The backend has now assigned the Citizen role.
      const data = await fetchProfile(credential.user, true);
      setProfile(data);

      return data;
    } catch (error) {
      // Do not silently leave a partially registered session active.
      await signOut(auth);
      throw error;
    }
  }

  async function login(email, password) {
    const demoProfile = getDemoProfile(email);
    if (demoProfile && demoProfile.password === password) {
      const demoUser = {
        uid: `demo-${demoProfile.role}`,
        email: demoProfile.email,
        displayName: demoProfile.display_name,
        emailVerified: true,
      };

      const profile = {
        uid: demoUser.uid,
        email: demoProfile.email,
        role: demoProfile.role,
        display_name: demoProfile.display_name,
        isDemo: true,
      };

      setUser(demoUser);
      setProfile(profile);
      return profile;
    }

    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const data = await fetchProfile(credential.user);
    setProfile(data);

    return data;
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        signup,
        login,
        logout,
        refreshProfile: async () => {
          if (!auth.currentUser) return null;

          const data = await fetchProfile(auth.currentUser, true);
          setProfile(data);
          return data;
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}