import { createContext, useState, useEffect, useContext, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { showError } from '@/utils/toast';
import type { Profile } from '@/types';
import type { JsonResume } from '@/types/resume'; // Import JsonResume type

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

// This hook was already present in src/hooks/usePortfolioContext.ts,
// but I'm including it here to ensure the cache: 'no-store' is applied
// to the resume fetch, as it's critical for the CareerFitAnalyst.
export const usePortfolioContext = (): { chatbotKnowledge: string | null; resume: JsonResume | null; loading: boolean; error: string | null; } => {
  const [chatbotKnowledge, setChatbotKnowledge] = useState<string | null>(null);
  const [resume, setResume] = useState<JsonResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const RESUME_URL = import.meta.env.VITE_RESUME_URL;

  useEffect(() => {
    const fetchContext = async () => {
      setLoading(true);
      setError(null); // Clear previous errors
      try {
        // Fetch chatbot knowledge
        const { data: knowledgeData, error: knowledgeError } = await supabase
          .from('chatbot_knowledge')
          .select('content')
          .eq('id', 1)
          .single();

        if (knowledgeError && knowledgeError.code !== 'PGRST116') { // Ignore "0 rows" error
          throw knowledgeError;
        }
        setChatbotKnowledge(knowledgeData?.content || "No knowledge base has been configured for the chatbot.");

        // Fetch resume data
        if (RESUME_URL) {
          const response = await fetch(RESUME_URL, { cache: 'no-store' }); // <--- Added cache: 'no-store'
          if (!response.ok) {
            throw new Error(`Failed to fetch resume from ${RESUME_URL}: ${response.statusText}`);
          }
          const resumeData: JsonResume = await response.json();
          setResume(resumeData);
        } else {
          console.warn("VITE_RESUME_URL is not set. Resume data will not be available.");
          setResume(null);
        }

      } catch (err: any) {
        setError(err.message);
        console.error("Failed to fetch portfolio context or resume:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [RESUME_URL]); // Added RESUME_URL to dependency array

  return { chatbotKnowledge, resume, loading, error };
};