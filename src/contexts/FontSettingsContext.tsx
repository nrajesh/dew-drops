import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { showSuccess, showError } from "@/utils/toast";

interface FontSettings {
  fontSize: number; // in rem
  lineHeight: number; // unitless
}

interface FontSettingsContextType {
  settings: FontSettings;
  updateSettings: (newSettings: Partial<FontSettings>) => void;
}

const defaultSettings: FontSettings = {
  fontSize: 1, // 1rem = 16px default
  lineHeight: 1.5, // 1.5 times font size
};

const FontSettingsContext = createContext<FontSettingsContextType | undefined>(
  undefined,
);

export const FontSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<FontSettings>(() => {
    try {
      const storedSettings = localStorage.getItem("fontSettings");
      return storedSettings ? JSON.parse(storedSettings) : defaultSettings;
    } catch (error) {
      console.error("Failed to load font settings from localStorage:", error);
      return defaultSettings;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fontSettings", JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save font settings to localStorage:", error);
      showError(
        "Failed to save font settings. Please check your browser's storage permissions.",
      );
    }
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<FontSettings>) => {
    setSettings((prevSettings) => ({ ...prevSettings, ...newSettings }));
    showSuccess("Font settings updated!");
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--base-font-size",
      `${settings.fontSize}rem`,
    );
    document.documentElement.style.setProperty(
      "--base-line-height",
      String(settings.lineHeight),
    );
  }, [settings]);

  return (
    <FontSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </FontSettingsContext.Provider>
  );
};

export const useFontSettings = () => {
  const context = useContext(FontSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useFontSettings must be used within a FontSettingsProvider",
    );
  }
  return context;
};
