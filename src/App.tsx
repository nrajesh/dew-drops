"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/integrations/supabase/session-provider";
import Layout from "@/components/Layout";
import Index from "@/pages/Index";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import CVPortfolio from "@/pages/CVPortfolio";
import AICareerFitAnalyst from "@/pages/AICareerFitAnalyst";
import GalleryImages from "@/pages/GalleryImages"; // Import the new page

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
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
                <Route path="cv-portfolio" element={<CVPortfolio />} />
                <Route path="ai-career-fit-analyst" element={<AICareerFitAnalyst />} />
                <Route path="gallery-images" element={<GalleryImages />} /> {/* Add the new route */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Router>
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;