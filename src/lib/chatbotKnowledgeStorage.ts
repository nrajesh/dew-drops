export const CHATBOT_KNOWLEDGE_STORAGE_KEY = "dew-drops-chatbot-knowledge";

export const CHATBOT_KNOWLEDGE_UPDATED_EVENT = "dew-drops-chatbot-knowledge-updated";

export function getStoredChatbotKnowledgeContent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CHATBOT_KNOWLEDGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** @returns false if storage is unavailable or write failed */
export function setStoredChatbotKnowledgeContent(content: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(CHATBOT_KNOWLEDGE_STORAGE_KEY, content);
    window.dispatchEvent(new Event(CHATBOT_KNOWLEDGE_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredChatbotKnowledgeContent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(CHATBOT_KNOWLEDGE_STORAGE_KEY);
    window.dispatchEvent(new Event(CHATBOT_KNOWLEDGE_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}
