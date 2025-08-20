import { NavLink, Outlet, Link } from "react-router-dom";
import { Menu, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { mainNavItems, managementNavItems } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import FloatingActions from "./FloatingActions"; // Updated import
import { useFeatureToggles } from "@/contexts/FeatureToggleContext";

const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const { toggles } = useFeatureToggles();

  const visibleMainNavItems = mainNavItems.filter(item => toggles[item.featureKey]);
  const visibleManagementNavItems = managementNavItems.filter(item => toggles[item.featureKey]);

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
      isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
    }`;

  const areManagementItemsVisible = visibleManagementNavItems.length > 0;

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
    </>
  );
};

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { session } = useAuth();

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

  return (
    <>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-sidebar md:block">
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
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6 lg:h-[60px]">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col bg-sidebar p-0">
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
              {/* Future content like breadcrumbs can go here */}
            </div>
            <ThemeToggle />
            {session ? (
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" asChild>
                <Link to="/login">
                  <LogIn className="h-5 w-5" />
                  <span className="sr-only">Login</span>
                </Link>
              </Button>
            )}
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <Outlet />
          </main>
          <footer className="border-t bg-background px-6 py-4">
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
      <FloatingActions /> {/* Updated component name */}
      <Toaster />
      <Sonner />
    </>
  );
};

export default Layout;