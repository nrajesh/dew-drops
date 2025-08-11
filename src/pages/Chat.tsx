import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { sendMessageToGemini } from "@/integrations/gemini/client";
import { showError } from "@/utils/toast";
import { Bot, User, Send } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(currentInput);
      const modelMessage: Message = { role: 'model', text: response };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error: any) {
      showError(error.message);
      setMessages(prev => prev.slice(0, -1)); // Remove user message on failure
    } finally {
      setIsLoading(false);
    }
  };

  if (!GEMINI_API_KEY) {
    return (
      <Card className="w-full h-full flex flex-col border-0 rounded-none">
        <CardHeader>
          <CardTitle>Chatbot Configuration Needed</CardTitle>
          <CardDescription>
            To use the chatbot, you need to provide a Google Gemini API key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border-l-4 border-destructive bg-destructive/10 rounded-md">
            <p className="font-semibold">API Key Missing</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please create a <code>.env.local</code> file in your project's root directory and add the following line:
            </p>
            <pre className="mt-2 p-2 bg-background rounded-md text-sm">
              <code>VITE_GEMINI_API_KEY="YOUR_API_KEY_HERE"</code>
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              You can get a free API key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>. After adding the key, please restart the application.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            placeholder="Type your message..."
            disabled={isLoading}
            autoComplete="off"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default Chat;