import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { showError } from "@/utils/toast";
import { Bot, User, Send } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePortfolioContext } from "@/hooks/usePortfolioContext";
import { sendMessageToGemini } from "@/integrations/gemini/client";

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClientError, setIsClientError] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { context, loading: contextLoading } = usePortfolioContext();

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  const formatContext = () => {
    if (!context) return "";

    const homePageContext = `
**Home Page Introduction:**
"Welcome to My Creative Space. A curated collection of professional work, personal projects and travels of Rajesh Narayanan. Explore my blog, watch my videos, and get in touch."
    `.trim();

    const postsContext = context.posts.length > 0 ? `
**Recent Blog Posts:**
${context.posts.map(p => `- Title: ${p.title}${p.description ? `, Description: ${p.description}` : ''}`).join('\n')}
    `.trim() : '';

    const locationsContext = context.locations.length > 0 ? `
**Recent Travel Locations:**
${context.locations.map(l => `- Location: ${l.title} in ${l.name}${l.description ? `. Notes: ${l.description}` : ''}`).join('\n')}
    `.trim() : '';

    const videosContext = context.videos.length > 0 ? `
**Featured Videos:**
${context.videos.map(v => `- ${v.title}`).join('\n')}
    `.trim() : '';

    const imagesContext = context.images.length > 0 ? `
**Photo Gallery Highlights (from image descriptions):**
${context.images.map(i => `- ${i.alt_text}`).join('\n')}
    `.trim() : '';

    return `
Here is some context about this portfolio website and its owner, Rajesh Narayanan. Please use this information to answer user questions conversationally, as if you are a helpful assistant for this website.

${homePageContext}

${postsContext}

${locationsContext}

${videosContext}

${imagesContext}

Based on this context, please answer the user's question.
---
User's question:
    `.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || contextLoading || isClientError) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const systemPrompt = formatContext();
      const fullPrompt = `${systemPrompt} ${currentInput}`;
      
      const responseText = await sendMessageToGemini(fullPrompt);

      const modelMessage: Message = { role: 'model', text: responseText };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      if (error.message.includes("VITE_GEMINI_API_KEY")) {
        showError("Chatbot is not configured. An API key is missing.");
        setIsClientError(true);
      } else {
        showError(error.message || "An error occurred while chatting.");
      }
      setMessages(prev => prev.slice(0, -1)); // Remove user message on failure
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col border-0 rounded-none">
      <CardHeader>
        <CardTitle>Gemini Chatbot</CardTitle>
        <CardDescription>Ask me anything! I'm here to help.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'model' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot size={20} /></AvatarFallback>
                  </Avatar>
                )}
                <div className={`rounded-lg p-3 max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                  </div>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><User size={20} /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot size={20} /></AvatarFallback>
                </Avatar>
                <div className="rounded-lg p-3 bg-muted">
                  <p className="text-sm animate-pulse">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isClientError ? "Chatbot not configured." :
              contextLoading ? "Learning about the portfolio..." : "Type your message..."
            }
            disabled={isLoading || contextLoading || isClientError}
            autoComplete="off"
          />
          <Button type="submit" disabled={isLoading || !input.trim() || contextLoading || isClientError}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default Chat;