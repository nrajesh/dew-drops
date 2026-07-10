import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { localDataProvider } from "@/lib/LocalDataProvider";
import {
  getStoredLocalDataBundleTabular,
  setStoredLocalDataBundleTabular,
  type LocalDataBundleTabular,
} from "@/lib/localDataBundleStorage";
import { navFeatures } from "@/config/navigation";
import { useAuth } from "./AuthContext";
import { showError, showSuccess } from "@/utils/toast";

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
    [navFeatures.RESUME]: true,
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

    const bundle = getStoredLocalDataBundleTabular();
    let updatedBundle: LocalDataBundleTabular;

    if (bundle) {
      const existingIndex = bundle.feature_toggles.findIndex(
        (t: Record<string, unknown>) => t.feature_key === featureKey,
      );
      if (existingIndex >= 0) {
        bundle.feature_toggles[existingIndex] = {
          ...bundle.feature_toggles[existingIndex],
          is_enabled: isEnabled,
        };
      } else {
        bundle.feature_toggles.push({
          feature_key: featureKey,
          is_enabled: isEnabled,
        });
      }
      updatedBundle = bundle;
    } else {
      updatedBundle = {
        posts: [],
        profiles: [],
        travel_locations: [],
        gallery_images: [],
        feature_toggles: [
          {
            feature_key: featureKey,
            is_enabled: isEnabled,
          },
        ],
      };
    }

    setStoredLocalDataBundleTabular(updatedBundle);
    setToggles((prev) => ({ ...prev, [featureKey]: isEnabled }));
    showSuccess(`Feature toggle "${featureKey}" updated.`);
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
