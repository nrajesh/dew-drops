import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import Videos from "./pages/Videos";
import Gallery from "./pages/Gallery";
import Travel from "./pages/Travel";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import ManageVideos from "./pages/ManageVideos";
import ManageTravel from "./pages/ManageTravel";
import { TravelProvider } from "./contexts/TravelContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TravelProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/travel" element={<Travel />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/manage-videos" element={<ManageVideos />} />
              <Route path="/manage-travel" element={<ManageTravel />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TravelProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;