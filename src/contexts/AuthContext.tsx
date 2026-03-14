import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { localDataProvider } from "@/lib/LocalDataProvider";
import { showError } from "@/utils/toast";
import type { Profile } from "@/types";

interface AuthContextType {
  session: { user: { id: string; email: string } } | null;
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, secret: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL || "write@nrajesh.com";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = useCallback(
    async (userId: string | null) => {
      if (userId) {
        const allProfiles = localDataProvider.getProfiles();
        const userProfile = allProfiles.find((p) => p.id === userId) || null;
        setProfile(userProfile);
        // Since Profile type might not have email, we use the userId or email we know from logic
        setIsAdmin(user?.email === ALLOWED_EMAIL);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    },
    [user?.email],
  );

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth_token");
    if (storedAuth === ALLOWED_EMAIL) {
      const mockUser = { id: "local-user", email: ALLOWED_EMAIL };
      setUser(mockUser);
      // fetchProfile will be called in its own effect or as needed
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const signIn = async (email: string, secret: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: secret }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("auth_token", ALLOWED_EMAIL);
        setUser(data.user);
        return true;
      }

      const errorData = await response.json();
      showError(errorData.error || "Invalid credentials.");
      return false;
    } catch (error) {
      console.error("Login error:", error);
      // Fallback for local development if API is not available
      const localPassword = import.meta.env.VITE_AUTH_PASSWORD;
      if (
        import.meta.env.DEV &&
        email === ALLOWED_EMAIL &&
        secret === localPassword &&
        localPassword
      ) {
        localStorage.setItem("auth_token", ALLOWED_EMAIL);
        const mockUser = { id: "local-user", email: ALLOWED_EMAIL };
        setUser(mockUser);
        return true;
      }
      showError("Connection error. Please try again later.");
      return false;
    }
  };

  const signOut = async () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const value = {
    session: user ? { user } : null,
    user,
    profile,
    loading,
    isAdmin,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
