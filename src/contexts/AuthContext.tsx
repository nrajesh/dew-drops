import { createContext, useState, useEffect, useContext, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { showError } from '@/utils/toast';
import type { Profile } from '@/types'; // Corrected import

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL || 'write@nrajesh.com';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const fetchProfile = useCallback(async (user: User | null) => {
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Ignore not found error
        console.error("Error fetching profile:", error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session && session.user.email !== ALLOWED_EMAIL) {
        supabase.auth.signOut();
        showError("You are not authorized to access this application.");
        setSession(null);
        setUser(null);
        setProfile(null);
      } else {
        setSession(session);
        const authUser = session?.user ?? null;
        setUser(authUser);
        await fetchProfile(authUser);
      }

      if (isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const value = {
    session,
    user,
    profile,
    loading,
    fetchProfile: () => fetchProfile(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};