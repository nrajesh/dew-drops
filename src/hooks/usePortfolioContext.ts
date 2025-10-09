import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { JsonResume } from '@/types/resume'; // Import JsonResume type

const RESUME_URL = import.meta.env.VITE_RESUME_URL;

export const usePortfolioContext = () => {
  const [chatbotKnowledge, setChatbotKnowledge] = useState<string | null>(null);
  const [resume, setResume] = useState<JsonResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      setLoading(true);
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
          const response = await fetch(RESUME_URL);
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
  }, []);

  return { chatbotKnowledge, resume, loading, error };
};