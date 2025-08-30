import { Outlet, Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";

const NavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
  <>
    <a href="/#books" onClick={onLinkClick} className="transition-colors hover:text-foreground/80 text-foreground/60">
      Books
    </a>
    <a href="/#about" onClick={onLinkClick} className="transition-colors hover:text-foreground/80 text-foreground/60">
      About
    </a>
    <Link to="/contact" onClick={onLinkClick} className="transition-colors hover:text-foreground/80 text-foreground/60">
      Contact
    </Link>
  </>
);

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Sripriya Srinivasan</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <NavLinks />
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <div className="grid gap-4 py-4">
                    <nav className="grid gap-2 text-lg font-medium">
                      <NavLinks onLinkClick={() => setMobileMenuOpen(false)} />
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p className="text-center text-sm leading-loose md:text-left">
              &copy; {new Date().getFullYear()} Sripriya Srinivasan. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
      <Toaster />
      <Sonner />
    </div>
  );
};

export default Layout;