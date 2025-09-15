import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePortfolioContext = () => {
  const [context, setContext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chatbot_knowledge')
          .select('content')
          .eq('id', 1)
          .single();

        if (error) throw error;

        setContext(data?.content || "No knowledge base has been configured for the chatbot.");
      } catch (err: any) {
        setError(err.message);
        console.error("Failed to fetch portfolio context:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, []);

  return { context, loading, error };
};