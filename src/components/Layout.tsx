import { NavLink, Outlet, Link } from "react-router-dom";
import { Menu, LogIn, LogOut, Plus, Bot, User as UserIcon, Text } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { mainNavItems, managementNavItems, navFeatures, settingsNavItems } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useFeatureToggles } from "@/contexts/FeatureToggleContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BlogForm, PostFormData } from "@/components/blog/BlogForm";
import { useNavigate } from "react-router-dom";
import Chat from "@/pages/Chat";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FontSizeLineHeightSliders } from "./FontSizeLineHeightSliders"; // Import the new component

const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const { toggles } = useFeatureToggles();
  const { session } = useAuth();

  const visibleMainNavItems = mainNavItems.filter(item => toggles[item.featureKey] || !item.featureKey);
  const visibleManagementNavItems = session ? managementNavItems.filter(item => toggles[item.featureKey]) : [];
  const visibleSettingsNavItems = session ? settingsNavItems : [];

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
      isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
    }`;

  const areManagementItemsVisible = visibleManagementNavItems.length > 0;
  const areSettingsItemsVisible = visibleSettingsNavItems.length > 0;

  return (
    <>
      <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
        {visibleMainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onLinkClick}
            end={item.to === "/"}
            className={navLinkClassName}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {areManagementItemsVisible && (
        <>
          <div className="mt-4 px-4 lg:px-6">
            <h3 className="mb-2 text-xs font-semibold uppercase text-sidebar-foreground/70 tracking-wider">
              Management
            </h3>
          </div>
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {visibleManagementNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onLinkClick}
                className={navLinkClassName}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {areSettingsItemsVisible && (
        <>
          <div className="mt-4 px-4 lg:px-6">
            <h3 className="mb-2 text-xs font-semibold uppercase text-sidebar-foreground/70 tracking-wider">
              Settings
            </h3>
          </div>
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {visibleSettingsNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onLinkClick}
                className={navLinkClassName}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </>
  );
};

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { session, profile } = useAuth();
  const [isAddBlogDialogOpen, setIsAddBlogDialogOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();
  const { toggles } = useFeatureToggles();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error && error.name !== 'AuthSessionMissingError') {
      showError("Logout failed. Please try again.");
      console.error("Logout error:", error);
    } else {
      showSuccess("You have been logged out.");
      window.location.href = "/";
    }
  };

  const handleFormSubmit = (values: PostFormData) => {
    setIsAddBlogDialogOpen(false);
    navigate('/manage-blog', { state: { newPostData: values } });
  };

  const avatarFallback = profile?.first_name && profile?.last_name
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
    : profile?.first_name?.charAt(0) || <UserIcon className="h-5 w-5" />;

  return (
    <>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] print:block">
        <div className="hidden border-r bg-sidebar md:block print:hidden">
          <div className="flex h-full max-h-screen flex-col">
            <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
              <NavLink to="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
                <span className="">My Portfolio</span>
              </NavLink>
            </div>
            <div className="flex-1 overflow-auto py-2">
              <NavContent />
            </div>
          </div>
        </div>
        <div className="flex flex-col print:block">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6 lg:h-[60px] print:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden print:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col bg-sidebar p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Main Menu</SheetTitle>
                  <SheetDescription>
                    A list of navigation links to browse the site.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex h-14 items-center border-b border-sidebar-border px-4">
                  <NavLink
                    to="/"
                    className="flex items-center gap-2 font-semibold text-sidebar-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>My Portfolio</span>
                  </NavLink>
                </div>
                <div className="flex-1 overflow-auto py-2">
                  <NavContent onLinkClick={() => setMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="w-full flex-1">
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Adjust font settings">
                  <Text className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Adjust font settings</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Text Readability</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <FontSizeLineHeightSliders />
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} alt="User avatar" />
                      <AvatarFallback>{avatarFallback}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/feature-toggles">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" asChild>
                <Link to="/login">
                  <LogIn className="h-5 w-5" />
                  <span className="sr-only">Login</span>
                </Link>
              </Button>
            )}
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible">
            <Outlet />
          </main>
          <footer className="border-t bg-background px-6 py-4 print:hidden">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} My Portfolio. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <Link to="/contact" className="hover:text-primary transition-colors">
                  Contact
                </Link>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
      <div className="fixed bottom-6 left-6 flex flex-col gap-4 z-40 print:hidden">
        {session && (
          <Button
            variant="default"
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsAddBlogDialogOpen(true)}
            aria-label="Add New Blog Post"
          >
            <Plus className="h-7 w-7" />
          </Button>
        )}
        {toggles[navFeatures.CHATBOT] && (
          <Button
            variant="default"
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsChatOpen(true)}
            aria-label="Open Chatbot"
          >
            <Bot className="h-7 w-7" />
          </Button>
        )}
      </div>

      {/* Removed Shadcn UI Toaster, keeping Sonner */}
      <Sonner /> 

      <Dialog open={isAddBlogDialogOpen} onOpenChange={setIsAddBlogDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Post</DialogTitle>
            <DialogDescription>
              Create a new blog post. You can use Markdown for the content.
            </DialogDescription>
          </DialogHeader>
          <BlogForm
            editingPost={null}
            galleryImages={[]}
            uniqueTags={[]}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsAddBlogDialogOpen(false)}
            isPopup={true}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="w-full sm:max-w-lg p-0 flex flex-col h-[80vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Chatbot</DialogTitle>
            <DialogDescription>
              A chat interface to ask questions about the portfolio.
            </DialogDescription>
          </DialogHeader>
          <Chat onClose={() => setIsChatOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Layout;