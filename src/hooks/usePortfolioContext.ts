import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { JsonResume } from '@/types/resume'; // Import JsonResume type

const RESUME_URL = import.meta.env.VITE_RESUME_URL;

interface PortfolioContextData {
  chatbotKnowledge: string | null;
  resume: JsonResume | null;
  loading: boolean;
  error: string | null;
}

export const usePortfolioContext = (): PortfolioContextData => {
  const [chatbotKnowledge, setChatbotKnowledge] = useState<string | null>(null);
  const [resume, setResume] = useState<JsonResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    let hasError = false;

    // Fetch chatbot knowledge
    try {
      const { data, error: kbError } = await supabase
        .from('chatbot_knowledge')
        .select('content')
        .eq('id', 1)
        .single();

      if (kbError && kbError.code !== 'PGRST116') { // Ignore "0 rows" error
        throw kbError;
      }
      setChatbotKnowledge(data?.content || "No knowledge base has been configured for the chatbot.");
    } catch (err: any) {
      setError(prev => prev ? `${prev}; Failed to fetch chatbot knowledge: ${err.message}` : `Failed to fetch chatbot knowledge: ${err.message}`);
      console.error("Failed to fetch chatbot knowledge:", err);
      hasError = true;
    }

    // Fetch resume
    if (RESUME_URL) {
      try {
        const response = await fetch(RESUME_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch resume: ${response.statusText}`);
        }
        const data: JsonResume = await response.json();
        setResume(data);
      } catch (err: any) {
        setError(prev => prev ? `${prev}; Failed to fetch resume: ${err.message}` : `Failed to fetch resume: ${err.message}`);
        console.error("Error fetching resume:", err);
        hasError = true;
      }
    } else {
      console.warn("VITE_RESUME_URL is not set. Resume data will not be available for weighted matching.");
      setResume(null);
    }

    setLoading(false);
    if (hasError && !error) { // Ensure error state is set if any error occurred
        setError("Some data failed to load. Check console for details.");
    }
  }, []);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return { chatbotKnowledge, resume, loading, error };
};