import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User as UserIcon, Loader2, AlertTriangle, X } from "lucide-react";
import { usePortfolioData } from "@/hooks/usePortfolioData"; // Updated import
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import { useJobMatching } from "@/hooks/useJobMatching";
import { sendMessageToGemini } from "@/integrations/gemini/client"; // Keep sendMessageToGemini for general chat

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
  const { chatbotKnowledge, resume, loading: contextLoading, error: contextError } = usePortfolioData(); // Updated hook name
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    isMatching,
    matchResult,
    performJobMatch,
    resetMatch,
    geminiClientError,
  } = useJobMatching();

  // Consolidate AI service error state
  const aiServiceError = geminiClientError || contextError;

  useEffect(() => {
    if (jobDescription && !isMatching && !matchResult) {
      // Only trigger job match if a description is provided and no match is in progress or already displayed
      handleJobMatch(jobDescription);
    } else if (!jobDescription && !matchResult && !contextLoading && !aiServiceError) {
      // Initial welcome message for general chat
      setMessages([{ role: "assistant", content: "Hello! I'm your portfolio assistant. How can I help you today?" }]);
    }
  }, [jobDescription, isMatching, matchResult, contextLoading, aiServiceError]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isMatching]); // Also scroll when matching state changes

  const handleJobMatch = async (description: string) => {
    if (contextLoading) {
      setMessages([{ role: "assistant", content: "Portfolio context is still loading. Please wait." }]);
      return;
    }
    if (!resume) {
      setMessages([{ role: "assistant", content: "Sorry, resume data is not available for matching. Please ensure VITE_RESUME_URL is set and accessible." }]);
      return;
    }
    if (aiServiceError) {
      setMessages([{ role: "assistant", content: aiServiceError || "An error occurred with the AI service or context loading." }]);
      return;
    }

    try {
      const result = await performJobMatch(description);
      const newMessages: Message[] = [
        { role: "assistant", content: result.reasoning },
        { role: "assistant", content: "Would you like to contact Rajesh to discuss this further?" }
      ];
      setMessages(newMessages);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error in job matching:", err);
      setMessages([{ role: "assistant", content: "Sorry, I encountered an error while analyzing the job description. Please try again later." }]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoadingChat || contextLoading || aiServiceError || isMatching) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoadingChat(true);

    try {
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
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error fetching chat response:", err);
      let displayMessage = `Sorry, an error occurred: ${err.message}`;

      if (err.message) {
        if (err.message.includes("API key not valid")) {
          displayMessage = "It seems there's an issue with the API key. Please check the configuration.";
        } else if (err.message.includes("503") && err.message.includes("The model is overloaded")) {
          displayMessage = "I am currently responding to multiple users. I hope we can connect again later!";
        } else if (err.message.includes("400") && err.message.includes("Bad Request")) {
          displayMessage = "The request to the AI model was malformed. This might be a temporary issue or an invalid prompt.";
        } else if (err.message.includes("429") || err.message.includes("rate limit")) {
          displayMessage = "You've hit the AI service rate limit. Please wait a moment and try again.";
        } else if (err.message.includes("VITE_GEMINI_API_KEY is not set") || err.message.includes("VITE_GEMINI_MODEL_NAME is not set")) {
          displayMessage = "AI service is not configured. Please ensure VITE_GEMINI_API_KEY and VITE_GEMINI_MODEL_NAME are set.";
        }
      }

      const errorMessage: Message = { role: "assistant", content: displayMessage };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleResetChat = () => {
    setMessages([{ role: "assistant", content: "Hello! I'm your portfolio assistant. How can I help you today?" }]);
    setInput("");
    resetMatch(); // Reset job matching state as well
  };

  const currentLoadingState = contextLoading || isMatching || isLoadingChat;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          {jobDescription ? "Job Matching Assistant" : "Portfolio Chatbot"}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetChat} disabled={currentLoadingState}>
            Reset
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {aiServiceError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuration Error</AlertTitle>
              <AlertDescription>
                {aiServiceError}
              </AlertDescription>
            </Alert>
          )}
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
            disabled={currentLoadingState || !chatbotKnowledge || !resume || !!aiServiceError}
          />
          <Button type="submit" disabled={currentLoadingState || !input.trim() || !chatbotKnowledge || !resume || !!aiServiceError}>
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