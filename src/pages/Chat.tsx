import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User as UserIcon, Loader2, AlertTriangle, X } from "lucide-react";
import { usePortfolioContext } from "@/hooks/usePortfolioContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import { useJobMatching } from "@/hooks/useJobMatching";
import { sendMessageToGemini, getGeminiInitializationError } from "@/integrations/gemini/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  jobDescription?: string;
  onClose: () => void;
}

const Chat = ({ jobDescription, onClose }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const { chatbotKnowledge, resume, loading: contextLoading, error: contextError } = usePortfolioContext();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    isMatching,
    matchResult,
    performJobMatch,
    geminiClientError: jobMatchingGeminiError,
  } = useJobMatching();

  useEffect(() => {
    const initError = getGeminiInitializationError();
    if (initError) {
      setApiKeyError(initError);
    } else {
      setApiKeyError(null);
    }
  }, []);

  useEffect(() => {
    if (jobMatchingGeminiError) {
      setApiKeyError(jobMatchingGeminiError);
    }
  }, [jobMatchingGeminiError]);

  useEffect(() => {
    if (jobDescription) {
      handleJobMatch(jobDescription);
    }
  }, [jobDescription]);

  const handleJobMatch = async (description: string) => {
    if (contextLoading) {
      setMessages([{ role: "assistant", content: "Portfolio context is still loading. Please wait." }]);
      return;
    }
    if (!resume) {
      setMessages([{ role: "assistant", content: "Sorry, resume data is not available for matching. Please ensure VITE_RESUME_URL is set and accessible." }]);
      return;
    }
    if (contextError || apiKeyError) {
      setMessages([{ role: "assistant", content: contextError || apiKeyError || "An error occurred with the AI service or context loading." }]);
      return;
    }

    try {
      const result = await performJobMatch(description);
      const newMessages: Message[] = [
        { role: "assistant", content: result.reasoning },
        { role: "assistant", content: "Would you like to contact Rajesh to discuss this further?" }
      ];
      setMessages(newMessages);
    } catch (error: any) {
      console.error("Error in job matching:", error);
      setMessages([{ role: "assistant", content: "Sorry, I encountered an error while analyzing the job description. Please try again later." }]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoadingChat || contextLoading || apiKeyError) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoadingChat(true);

    try {
      if (contextError) throw new Error(contextError);
      if (!chatbotKnowledge) throw new Error("Knowledge base is not available.");

      const systemPrompt = `You are a helpful assistant for a personal portfolio website.
      Use ONLY the following context to answer the user's question.
      Be friendly, concise, and helpful. If the answer is not in the context, say you don't have that information. Do not make things up.

      CONTEXT:
      ---
      ${chatbotKnowledge}
      ---

      QUESTION:
      ${input}
      `;

      const response = await sendMessageToGemini(systemPrompt);
      const assistantMessage: Message = { role: "assistant", content: response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error fetching chat response:", error);
      let displayMessage = `Sorry, an error occurred: ${error.message}`;

      if (error.message) {
        if (error.message.includes("API key not valid")) {
          displayMessage = "It seems there's an issue with the API key. Please check the configuration.";
        } else if (error.message.includes("503") && error.message.includes("The model is overloaded")) {
          displayMessage = "I am currently responding to multiple users. I hope we can connect again later!";
        } else if (error.message.includes("400") && error.message.includes("Bad Request")) {
          displayMessage = "The request to the AI model was malformed. This might be a temporary issue or an invalid prompt.";
        } else if (error.message.includes("429") || error.message.includes("rate limit")) {
          displayMessage = "You've hit the AI service rate limit. Please wait a moment and try again.";
        } else if (error.message.includes("VITE_GEMINI_API_KEY is not set") || error.message.includes("VITE_GEMINI_MODEL_NAME is not set")) {
          displayMessage = "AI service is not configured. Please ensure VITE_GEMINI_API_KEY and VITE_GEMINI_MODEL_NAME are set.";
        }
      }

      const errorMessage: Message = { role: "assistant", content: displayMessage };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  if (apiKeyError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            {apiKeyError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentLoadingState = contextLoading || isMatching || isLoadingChat;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          Job Matching Assistant
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
          <span className="sr-only">Close chat</span>
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && <Bot className="h-6 w-6 text-primary" />}
              <div className={`rounded-lg p-3 max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} prose dark:prose-invert max-w-none`}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              {message.role === 'user' && <UserIcon className="h-6 w-6" />}
            </div>
          ))}
          {currentLoadingState && (
            <div className="flex items-start gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <div className="rounded-lg p-3 bg-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Rajesh's profile or job requirements..."
            disabled={currentLoadingState || !chatbotKnowledge || !resume || !!contextError || !!apiKeyError}
          />
          <Button type="submit" disabled={currentLoadingState || !input.trim() || !chatbotKnowledge || !resume || !!contextError || !!apiKeyError}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
        <div className="mt-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate("/contact");
            }}
          >
            Contact Rajesh
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;