import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User as UserIcon, Loader2, AlertTriangle } from "lucide-react";
import { usePortfolioContext } from "@/hooks/usePortfolioContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Message {
  role: "user" | "assistant";
  content: string;
}

let sendMessageToGemini: (message: string) => Promise<string>;

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const { context, loading: contextLoading, error: contextError } = usePortfolioContext();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initGemini = async () => {
      try {
        const module = await import('@/integrations/gemini/client');
        sendMessageToGemini = module.sendMessageToGemini;
      } catch (error: any) {
        setApiKeyError(error.message);
      }
    };
    initGemini();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || contextLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (contextError) throw new Error(contextError);
      if (!context) throw new Error("Knowledge base is not available.");
      if (!sendMessageToGemini) throw new Error("Chat client is not initialized.");

      const systemPrompt = `You are a helpful assistant for a personal portfolio website.
      Use ONLY the following context to answer the user's question.
      Be friendly, concise, and helpful. If the answer is not in the context, say you don't have that information. Do not make things up.

      CONTEXT:
      ---
      ${context}
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

      // Check for specific Gemini API overload error
      if (error.message && error.message.includes("503") && error.message.includes("The model is overloaded")) {
        displayMessage = "I am currently responding to multiple users. I hope we can connect again later!";
      } else if (error.message && error.message.includes("400") && error.message.includes("API key not valid")) {
        displayMessage = "It seems there's an issue with the API key. Please check the configuration.";
      }
      
      const errorMessage: Message = { role: "assistant", content: displayMessage };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
            The chatbot is not configured correctly. Please ensure the <code>VITE_GEMINI_API_KEY</code> is set in your environment variables.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          AI Assistant
        </h3>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && <Bot className="h-6 w-6 text-primary" />}
              <div className={`rounded-lg p-3 max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && <UserIcon className="h-6 w-6" />}
            </div>
          ))}
          {isLoading && (
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
            placeholder="Ask about my projects, travel, or photos..."
            disabled={isLoading || contextLoading}
          />
          <Button type="submit" disabled={isLoading || contextLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;