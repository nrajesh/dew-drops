import { NavLink, Outlet, Link } from "react-router-dom";
import { Home, Newspaper, Youtube, Image, Map, Mail, Menu, Settings, MapPin, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/blog", icon: Newspaper, label: "Blog" },
  { to: "/videos", icon: Youtube, label: "Videos" },
  { to: "/gallery", icon: Image, label: "Gallery" },
  { to: "/travel", icon: Map, label: "Travel" },
  { to: "/contact", icon: Mail, label: "Contact" },
];

const managementItems = [
  { to: "/manage-blog", icon: Edit, label: "Manage Blog" },
  { to: "/manage-videos", icon: Settings, label: "Manage Videos" },
  { to: "/manage-travel", icon: MapPin, label: "Manage Travel" },
];

const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
      isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
    }`;

  return (
    <>
      <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
        {navItems.map((item) => (
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
      <div className="mt-4 px-4 lg:px-6">
        <h3 className="mb-2 text-xs font-semibold uppercase text-sidebar-foreground/70 tracking-wider">
          Management
        </h3>
      </div>
      <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
        {managementItems.map((item) => (
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
  );
};

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <Outlet />
          </main>
          <footer className="border-t bg-background px-6 py-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} My Portfolio. All rights reserved.</p>
              <Link to="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </div>
          </footer>
        </div>
      </div>
      <Toaster />
      <Sonner />
    </>
  );
};

export default Layout;