import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { navFeatures } from '@/config/navigation';

interface FeatureToggleContextType {
  toggles: Record<string, boolean>;
  loading: boolean;
  updateToggle: (featureKey: string, isEnabled: boolean) => Promise<void>;
}

const FeatureToggleContext = createContext<FeatureToggleContextType | undefined>(undefined);

// All features that are actually toggleable
const ALL_FEATURES = Object.values(navFeatures).filter(key => key !== navFeatures.HOME);

export const FeatureToggleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const initializeTogglesForAdmin = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('feature_toggles').select('*').eq('user_id', userId);
    
    if (error) {
      showError("Could not load your feature settings.");
      console.error(error);
      return {};
    }

    const existingToggles = new Map(data.map(t => [t.feature_key, t.is_enabled]));
    const missingToggles = ALL_FEATURES.filter(key => !existingToggles.has(key));

    if (missingToggles.length > 0) {
      const newToggles = missingToggles.map(key => ({
        user_id: userId,
        feature_key: key,
        is_enabled: true, // Default to enabled for admin
      }));
      const { error: insertError } = await supabase.from('feature_toggles').insert(newToggles);
      if (insertError) {
        showError("Could not initialize default feature settings.");
        console.error(insertError);
      } else {
        missingToggles.forEach(key => existingToggles.set(key, true));
      }
    }
    
    const finalToggles = Object.fromEntries(existingToggles);
    finalToggles[navFeatures.HOME] = true; // Always ensure Home is enabled
    return finalToggles;
  }, []);

  const fetchPublicToggles = useCallback(async () => {
    const { data, error } = await supabase
      .from('feature_toggles')
      .select('feature_key, is_enabled');

    if (error) {
        showError("Could not load website features.");
        console.error(error);
        // Fallback to safe defaults on error
        return {
            [navFeatures.HOME]: true,
            [navFeatures.BLOG]: true,
            [navFeatures.GALLERY]: true,
            [navFeatures.TRAVEL]: true,
            [navFeatures.CHATBOT]: false,
            [navFeatures.MANAGE_BLOG]: false,
            [navFeatures.MANAGE_GALLERY]: false,
            [navFeatures.MANAGE_TRAVEL]: false,
            [navFeatures.FEATURE_TOGGLES]: false,
        };
    }

    const publicToggles = Object.fromEntries(data.map(t => [t.feature_key, t.is_enabled]));
    publicToggles[navFeatures.HOME] = true; // Home is always on

    // Ensure management routes are always off for logged-out users
    publicToggles[navFeatures.MANAGE_BLOG] = false;
    publicToggles[navFeatures.MANAGE_GALLERY] = false;
    publicToggles[navFeatures.MANAGE_TRAVEL] = false;
    publicToggles[navFeatures.FEATURE_TOGGLES] = false;

    return publicToggles;
  }, []);

  useEffect(() => {
    setLoading(true);
    const loadToggles = async () => {
      let newToggles;
      if (user) {
        newToggles = await initializeTogglesForAdmin(user.id);
      } else {
        newToggles = await fetchPublicToggles();
      }
      setToggles(newToggles);
      setLoading(false);
    };

    loadToggles();
  }, [user, initializeTogglesForAdmin, fetchPublicToggles]);

  const updateToggle = async (featureKey: string, isEnabled: boolean) => {
    if (!user) {
      showError("You must be logged in to change settings.");
      return;
    }

    setToggles(prev => ({ ...prev, [featureKey]: isEnabled }));

    const { error } = await supabase
      .from('feature_toggles')
      .update({ is_enabled: isEnabled })
      .eq('user_id', user.id)
      .eq('feature_key', featureKey);

    if (error) {
      showError(`Failed to update ${featureKey}. Reverting.`);
      console.error(error);
      setToggles(prev => ({ ...prev, [featureKey]: !isEnabled }));
    } else {
      showSuccess("Setting saved!");
    }
  };

  const value = { toggles, loading, updateToggle };

  return (
    <FeatureToggleContext.Provider value={value}>
      {children}
    </FeatureToggleContext.Provider>
  );
};

export const useFeatureToggles = () => {
  const context = useContext(FeatureToggleContext);
  if (context === undefined) {
    throw new Error('useFeatureToggles must be used within a FeatureToggleProvider');
  }
  return context;
};