import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User as UserIcon, Loader2, AlertTriangle } from "lucide-react";
import { useChatbotKnowledge } from "@/hooks/useChatbotKnowledge"; // Changed import
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Removed apiKeyError state as Gemini is no longer used
  const { knowledge, loading: knowledgeLoading, error: knowledgeError } = useChatbotKnowledge(); // Changed hook
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Removed useEffect for initGemini

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || knowledgeLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (knowledgeError) throw new Error(knowledgeError);
      if (!knowledge) throw new Error("Knowledge base is not available.");

      // Simple local response logic
      let botResponseContent: string;
      const lowerCaseInput = input.toLowerCase();
      const lowerCaseKnowledge = knowledge.toLowerCase();

      if (lowerCaseInput.includes("hello") || lowerCaseInput.includes("hi")) {
        botResponseContent = "Hello there! How can I help you today?";
      } else if (lowerCaseInput.includes("blog") && lowerCaseKnowledge.includes("blog post")) {
        botResponseContent = "I have information about blog posts. What specifically would you like to know?";
      } else if (lowerCaseInput.includes("gallery") && lowerCaseKnowledge.includes("gallery image")) {
        botResponseContent = "I have details about gallery images. Feel free to ask!";
      } else if (lowerCaseInput.includes("travel") && lowerCaseKnowledge.includes("travel location")) {
        botResponseContent = "I can tell you about travel locations. What's on your mind?";
      } else if (lowerCaseKnowledge.includes(lowerCaseInput)) {
        // A very basic keyword match
        botResponseContent = "Based on my knowledge, here's what I found: " + knowledge.split('\n\n').filter(s => s.toLowerCase().includes(lowerCaseInput)).join('\n\n');
        if (botResponseContent.length > 200) { // Truncate long responses
          botResponseContent = botResponseContent.substring(0, 200) + "... (For more details, please browse the relevant section of the portfolio.)";
        }
      } else {
        botResponseContent = "I don't have specific information about that in my current knowledge base. Please try asking about blog posts, gallery images, or travel locations.";
      }

      const assistantMessage: Message = { role: "assistant", content: botResponseContent };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error generating chat response:", error);
      const errorMessage: Message = { role: "assistant", content: `Sorry, an error occurred: ${error.message}. Please try again.` };
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

  // Removed apiKeyError check, replaced with knowledgeError
  if (knowledgeError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Knowledge Base Error</AlertTitle>
          <AlertDescription>
            The chatbot's knowledge base could not be loaded. Please try refreshing the page.
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
            disabled={isLoading || knowledgeLoading}
          />
          <Button type="submit" disabled={isLoading || knowledgeLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;