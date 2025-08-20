import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import Chat from "@/pages/Chat";
import { useFeatureToggles } from "@/contexts/FeatureToggleContext";
import { navFeatures } from "@/config/navigation";

const FloatingChatbot = () => {
  const { toggles } = useFeatureToggles();
  const isChatVisible = toggles[navFeatures.CHATBOT];

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
        <SheetHeader className="sr-only">
          <SheetTitle>Chatbot</SheetTitle>
          <SheetDescription>
            A chat interface to ask questions about the portfolio.
          </SheetDescription>
        </SheetHeader>
        <Chat />
      </SheetContent>
    </Sheet>
  );
};

export default FloatingChatbot;