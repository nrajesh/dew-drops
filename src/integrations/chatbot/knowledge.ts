import { supabase } from '@/integrations/supabase/client';

export const fetchChatbotKnowledge = async () => {
  const { data, error } = await supabase
    .from('chatbot_knowledge')
    .select('content');

  if (error) {
    console.error("Error fetching chatbot knowledge:", error);
    throw new Error("Failed to load chatbot knowledge.");
  }

  return data.map(item => item.content).join('\n\n');
};