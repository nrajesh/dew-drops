"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
// Removed SessionProvider as AuthProvider in main.tsx handles it
import Layout from "@/components/Layout";
import Index from "@/pages/Index";
import About from "@/pages/About"; // Corrected import
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy"; // Corrected import
import Terms from "@/pages/Terms"; // Corrected import
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import Portfolio from "@/pages/Portfolio"; // Corrected import
import MatchCV from "@/pages/MatchCV"; // Corrected import
import GalleryImages from "@/pages/GalleryImages"; // Import the new page

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* SessionProvider removed as AuthProvider in main.tsx handles it */}
      <TooltipProvider>
        <Toaster />
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Index />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
              <Route path="login" element={<Login />} />
              <Route path="profile" element={<Profile />} />
              <Route path="portfolio" element={<Portfolio />} /> {/* Corrected route path */}
              <Route path="match-cv" element={<MatchCV />} /> {/* Corrected route path */}
              <Route path="gallery-images" element={<GalleryImages />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;