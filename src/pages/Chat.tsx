import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User as UserIcon, Loader2, AlertTriangle, X } from "lucide-react";
import { usePortfolioContext } from "@/hooks/usePortfolioContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { calculateCosineSimilarity } from "@/utils/cosineSimilarity"; // Import the new utility

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  jobDescription?: string;
  onClose: () => void;
}

let sendMessageToGemini: (message: string) => Promise<string>;

const Chat = ({ jobDescription, onClose }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const { context, loading: contextLoading, error: contextError } = usePortfolioContext();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (jobDescription) {
      // Start the job matching process when a job description is provided
      handleJobMatch(jobDescription);
    }
  }, [jobDescription]);

  const handleJobMatch = async (description: string) => {
    if (!context || contextError) return;

    setIsLoading(true);
    setMessages([]);

    try {
      // Calculate match percentage using cosine similarity
      const matchPercentage = calculateCosineSimilarity(description, context);

      // Generate reasoning using Gemini
      const reasoning = await generateReasoning(description, context, matchPercentage);

      // Add messages to the chat
      const newMessages: Message[] = [
        { role: "assistant", content: `I've analyzed your job description and found a ${matchPercentage.toFixed(0)}% match with Rajesh's profile.` },
        { role: "assistant", content: reasoning },
        { role: "assistant", content: "Would you like to contact Rajesh to discuss this further?" }
      ];

      setMessages(newMessages);
    } catch (error: any) {
      console.error("Error in job matching:", error);
      setMessages([{ role: "assistant", content: "Sorry, I encountered an error while analyzing the job description. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReasoning = async (description: string, context: string, matchPercentage: number): Promise<string> => {
    if (!sendMessageToGemini) throw new Error("Chat client is not initialized.");

    const systemPrompt = `You are a world-class hiring manager analyzing a job description against a candidate's profile.
    Job Description: ${description}
    Candidate Profile: ${context}
    Match Percentage: ${matchPercentage.toFixed(0)}%

    Provide a concise reasoning (2-3 sentences) explaining why this is a ${matchPercentage.toFixed(0)}% match or why it isn't.
    If the match is high, highlight specific skills or experiences that align.
    If the match is low, suggest areas where the candidate might need to improve or where the job description might need to be adjusted.
    Be professional and constructive in your assessment.`;

    const response = await sendMessageToGemini(systemPrompt);
    return response;
  };

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

      const systemPrompt = `You are a world-class hiring manager analyzing a job description against a candidate's profile.
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
            placeholder="Ask about Rajesh's profile or job requirements..."
            disabled={isLoading || contextLoading}
          />
          <Button type="submit" disabled={isLoading || contextLoading || !input.trim()}>
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