import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { JsonResume } from "@/types/resume"; // Import JsonResume type

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = 10000,
) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout / 1000} seconds.`);
    }
    throw error;
  }
};

export const usePortfolioData = (): {
  chatbotKnowledge: string | null;
  resume: JsonResume | null;
  loading: boolean;
  error: string | null;
} => {
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
          .from("chatbot_knowledge")
          .select("content")
          .eq("id", 1)
          .single();

        if (knowledgeError && knowledgeError.code !== "PGRST116") {
          // Ignore "0 rows" error
          throw knowledgeError;
        }
        setChatbotKnowledge(
          knowledgeData?.content ||
            "No knowledge base has been configured for the chatbot.",
        );

        // Fetch resume data
        if (RESUME_URL) {
          const response = await fetchWithTimeout(
            RESUME_URL,
            { cache: "no-store" },
            15000,
          ); // 15 second timeout
          if (!response.ok) {
            throw new Error(
              `Failed to fetch resume from ${RESUME_URL}: ${response.statusText}`,
            );
          }
          const resumeData: JsonResume = await response.json();
          setResume(resumeData);
        } else {
          console.warn(
            "VITE_RESUME_URL is not set. Resume data will not be available.",
          );
          setResume(null);
        }
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message);
        console.error("Failed to fetch portfolio context or resume:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [RESUME_URL]); // Added RESUME_URL to dependency array

  return { chatbotKnowledge, resume, loading, error };
};
