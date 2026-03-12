import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { localDataProvider } from "@/lib/LocalDataProvider";
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
  return {
    [navFeatures.HOME]: true,
    [navFeatures.BLOG]: true,
    [navFeatures.GALLERY]: true,
    [navFeatures.PORTFOLIO]: true,
    [navFeatures.TRAVEL]: true,
    [navFeatures.CONTACT]: true,
    [navFeatures.CHATBOT]: true,
    [navFeatures.MATCH_CV]: true,
    [navFeatures.MANAGE_BLOG]: true,
    [navFeatures.MANAGE_GALLERY]: true,
    [navFeatures.MANAGE_TRAVEL]: true,
    [navFeatures.FEATURE_TOGGLES]: true,
  };
};

const getLocalToggles = (): Toggles => {
  try {
    const data = localDataProvider.getFeatureToggles();
    const toggles = defaultToggles();
    data.forEach((toggle: Record<string, unknown>) => {
      toggles[toggle.feature_key as string] = toggle.is_enabled as boolean;
    });
    return toggles;
  } catch (error) {
    console.error("Failed to get feature toggles from local data:", error);
    return defaultToggles();
  }
};

export const FeatureToggleProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [toggles, setToggles] = useState<Toggles>(getLocalToggles);
  const { session } = useAuth();
  const user = session?.user;
  const [loading] = useState(false);

  const refetchToggles = () => {
    setToggles(getLocalToggles());
  };

  const updateToggle = async (featureKey: string, isEnabled: boolean) => {
    if (!user) {
      showError("You must be logged in to change settings.");
      return;
    }
    // In a real local setup, we would write to the JSON file or a local storage override.
    // For now, let's just update the state to show it works.
    setToggles((prev) => ({ ...prev, [featureKey]: isEnabled }));
    showError(
      "Updates are local only; they will not persist to the source JSON yet.",
    );
  };

  useEffect(() => {
    refetchToggles();
  }, []);

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
