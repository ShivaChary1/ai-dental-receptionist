import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { identify } from "../lib/analytics.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "dental_token";
const ROLE_KEY = "dental_role";
const USER_KEY = "dental_user";

function readStored() {
  try {
    return {
      token: localStorage.getItem(TOKEN_KEY),
      role: localStorage.getItem(ROLE_KEY),
      user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
    };
  } catch {
    return { token: null, role: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored);

  // Keep tabs in sync (e.g. logout in another tab, or axios 401 clearing storage).
  useEffect(() => {
    const onStorage = () => setAuth(readStored());
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onStorage);
    };
  }, []);

  const login = ({ access_token, role, user }) => {
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
    setAuth({ token: access_token, role, user });
    if (user?.id) identify(user.id, { email: user.email, role });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth({ token: null, role: null, user: null });
  };

  const value = useMemo(
    () => ({
      ...auth,
      isAuthenticated: !!auth.token,
      isPatient: auth.role === "patient",
      isHospital: auth.role === "hospital",
      isSuperAdmin: auth.role === "superadmin",
      login,
      logout,
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Where a signed-in user of a given role "lives" in the app. */
export function homePathFor(role) {
  if (role === "hospital") return "/hospital";
  if (role === "superadmin") return "/superadmin";
  return "/account";
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
