import { useState, useEffect } from "react";
import { localDataProvider } from "@/lib/LocalDataProvider";
import type { JsonResume } from "@/types/resume";

const RESUME_URL = import.meta.env.VITE_RESUME_URL;

export const usePortfolioData = () => {
  const [chatbotKnowledge, setChatbotKnowledge] = useState<string>("");
  const [resume, setResume] = useState<JsonResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Chatbot Knowledge from LocalDataProvider
        const knowledgeData = localDataProvider.getChatbotKnowledge();
        if (knowledgeData && knowledgeData.length > 0) {
          setChatbotKnowledge(knowledgeData[0].content || "");
        } else {
          setChatbotKnowledge(
            "No knowledge base has been configured for the chatbot.",
          );
        }

        // Fetch Resume from Public URL
        if (RESUME_URL) {
          try {
            const resp = await fetch(RESUME_URL);
            if (resp.ok) {
              const data = await resp.json();
              setResume(data);
            } else {
              console.warn("Failed to fetch resume from URL:", RESUME_URL);
            }
          } catch (e) {
            console.warn("Error fetching resume:", e);
          }
        }
      } catch (e: unknown) {
        const err = e as Error;
        console.error("Error fetching portfolio data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { chatbotKnowledge, resume, loading, error };
};
