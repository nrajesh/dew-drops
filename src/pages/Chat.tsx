import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User as UserIcon, Loader2 } from "lucide-react";
import { useFeatureToggles } from "@/contexts/FeatureToggleContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { refetchToggles } = useFeatureToggles();

  useEffect(() => {
    refetchToggles();
  }, [refetchToggles]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // This is a placeholder for your actual API call to the chatbot backend
      const response = await new Promise<string>((resolve) =>
        setTimeout(() => resolve("This is a simulated response from the AI assistant."), 1000)
      );

      const assistantMessage: Message = { role: "assistant", content: response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error fetching chat response:", error);
      const errorMessage: Message = { role: "assistant", content: "Sorry, I couldn't get a response. Please try again." };
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
                <p className="text-sm">{message.content}</p>
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
            placeholder="Ask me anything about this portfolio..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;