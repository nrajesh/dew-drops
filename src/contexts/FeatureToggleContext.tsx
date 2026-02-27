import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { navFeatures } from "@/config/navigation";
import { useAuth } from "./AuthContext";
import { showError } from "@/utils/toast";

type Toggles = Record<string, boolean>;

interface FeatureToggleContextType {
  toggles: Toggles;
  loading: boolean;
  refetchToggles: () => void;
  updateToggle: (featureKey: string, isEnabled: boolean) => Promise<void>;
}

const FeatureToggleContext = createContext<
  FeatureToggleContextType | undefined
>(undefined);

const defaultToggles = (): Toggles => {
  try {
    return {
      [navFeatures.HOME]: true,
      [navFeatures.BLOG]: true,
      [navFeatures.GALLERY]: true,
      [navFeatures.PORTFOLIO]: false,
      [navFeatures.TRAVEL]: true,
      [navFeatures.CONTACT]: true,
      [navFeatures.CHATBOT]: false,
      [navFeatures.MATCH_CV]: true,
      [navFeatures.MANAGE_BLOG]: false,
      [navFeatures.MANAGE_GALLERY]: false,
      [navFeatures.MANAGE_TRAVEL]: false,
      [navFeatures.FEATURE_TOGGLES]: true,
    };
  } catch (e) {
    console.error(
      "Error constructing default toggles, navFeatures might be incomplete:",
      e,
    );
    return { [navFeatures.HOME]: true };
  }
};

const fetchToggles = async (): Promise<Toggles> => {
  try {
    const { data, error } = await supabase
      .from("feature_toggles")
      .select("feature_key, is_enabled");
    if (error) throw error;

    const toggles = defaultToggles();
    data.forEach((toggle) => {
      toggles[toggle.feature_key] = toggle.is_enabled;
    });
    return toggles;
  } catch (error) {
    console.error(
      "Failed to fetch feature toggles from DB, using defaults:",
      error,
    );
    return defaultToggles();
  }
};

export const FeatureToggleProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // ✅ FIX: Initialize with defaults synchronously so the app renders immediately.
  // The loading flag is now only true briefly — the Supabase fetch updates toggles
  // in the background without blocking the initial render.
  const [toggles, setToggles] = useState<Toggles>(defaultToggles);
  const loading = false; // app renders immediately with defaults; Supabase updates silently
  const { user } = useAuth();

  const refetchToggles = async () => {
    const globalToggles = await fetchToggles();
    globalToggles[navFeatures.HOME] = true;
    setToggles(globalToggles);
  };

  const updateToggle = async (featureKey: string, isEnabled: boolean) => {
    if (!user) {
      showError("You must be logged in to change settings.");
      return;
    }
    try {
      const { error } = await supabase
        .from("feature_toggles")
        .upsert(
          { feature_key: featureKey, is_enabled: isEnabled, user_id: user.id },
          { onConflict: "feature_key, user_id" },
        );
      if (error) throw error;
      await refetchToggles();
    } catch (error: unknown) {
      const err = error as Error;
      showError(`Failed to update setting: ${err.message}`);
    }
  };

  useEffect(() => {
    // Fetch real toggles from Supabase in the background; app is already
    // rendering with defaults so this is non-blocking.
    refetchToggles();
  }, []); // intentionally run once on mount

  return (
    <FeatureToggleContext.Provider
      value={{ toggles, loading, refetchToggles, updateToggle }}
    >
      {children}
    </FeatureToggleContext.Provider>
  );
};

export const useFeatureToggles = () => {
  const context = useContext(FeatureToggleContext);
  if (context === undefined) {
    throw new Error(
      "useFeatureToggles must be used within a FeatureToggleProvider",
    );
  }
  return context;
};
