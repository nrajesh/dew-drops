import { useState, useEffect } from 'react';
import { fetchChatbotKnowledge } from '../integrations/chatbot/knowledge'; // Changed to relative path

export const useChatbotKnowledge = () => {
  const [knowledge, setKnowledge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKnowledge = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedKnowledge = await fetchChatbotKnowledge();
      setKnowledge(fetchedKnowledge);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

  return { knowledge, loading, error, refetchKnowledge: loadKnowledge };
};