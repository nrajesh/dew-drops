import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Chat from "@/pages/Chat";

const getVisibility = (envVar: string | undefined, defaultValue: boolean): boolean => {
  if (envVar === undefined) {
    return defaultValue;
  }
  return envVar.toLowerCase() === 'true';
};

const isChatVisible = getVisibility(import.meta.env.VITE_NAV_CHATBOT_VISIBLE, true);

const FloatingChatbot = () => {
  if (!isChatVisible) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg z-40"
          aria-label="Open Chatbot"
        >
          <Bot className="h-7 w-7" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 flex flex-col">
        <Chat />
      </SheetContent>
    </Sheet>
  );
};

export default FloatingChatbot;