import { Bot, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Chat from "@/pages/Chat";
import { useFeatureToggles } from "@/contexts/FeatureToggleContext";
import { navFeatures } from "@/config/navigation";
import { QuickAddPostDialog } from "./QuickAddPostDialog";
import { useState } from "react";

const FloatingActions = () => {
  const { toggles } = useFeatureToggles();
  const isChatVisible = toggles[navFeatures.CHATBOT];
  const isManageBlogVisible = toggles[navFeatures.MANAGE_BLOG];

  const [isQuickAddPostOpen, setIsQuickAddPostOpen] = useState(false);

  if (!isChatVisible && !isManageBlogVisible) {
    return null;
  }

  return (
    <>
      {isChatVisible && (
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
      )}

      {isManageBlogVisible && (
        <Button
          variant="default"
          size="icon"
          className={`fixed bottom-6 h-14 w-14 rounded-full shadow-lg z-40 ${isChatVisible ? 'left-24' : 'left-6'}`}
          aria-label="Quick Add Blog Post"
          onClick={() => setIsQuickAddPostOpen(true)}
        >
          <PlusSquare className="h-7 w-7" />
        </Button>
      )}

      <QuickAddPostDialog
        isOpen={isQuickAddPostOpen}
        onClose={() => setIsQuickAddPostOpen(false)}
        onPostAdded={() => { /* Optionally refresh blog list if needed */ }}
      />
    </>
  );
};

export default FloatingActions;