import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { FeatureToggleProvider } from "./contexts/FeatureToggleContext.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true }}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        storageKey="portfolio-theme"
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <FeatureToggleProvider>
              <TooltipProvider>
                <App />
                <SpeedInsights />
              </TooltipProvider>
            </FeatureToggleProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);