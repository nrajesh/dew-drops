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
import { FontSettingsProvider } from "./contexts/FontSettingsContext.tsx"; // Import the new provider
// The usePortfolioContext import is not directly used here, but it's good practice to ensure no conflicts.

const queryClient = new QueryClient();

// Suppress the specific YouTube embed error
const originalConsoleError = console.error;
console.error = function(...args) {
  if (typeof args[0] === 'string' && args[0].includes('Blocked a frame with origin "https://www.youtube.com"')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        storageKey="portfolio-theme"
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <FeatureToggleProvider>
              <FontSettingsProvider> {/* Wrap with FontSettingsProvider */}
                <TooltipProvider>
                  <App />
                  <SpeedInsights />
                </TooltipProvider>
              </FontSettingsProvider>
            </FeatureToggleProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Clear the boot timeout since the app successfully loaded
if (typeof window !== 'undefined' && window.appBootTimeout) {
  clearTimeout(window.appBootTimeout);
}