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

  const initializeToggles = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('feature_toggles').select('*').eq('user_id', userId);
    
    if (error) {
      showError("Could not load feature settings.");
      console.error(error);
      return {};
    }

    const existingToggles = new Map(data.map(t => [t.feature_key, t.is_enabled]));
    const missingToggles = ALL_FEATURES.filter(key => !existingToggles.has(key));

    if (missingToggles.length > 0) {
      const newToggles = missingToggles.map(key => ({
        user_id: userId,
        feature_key: key,
        is_enabled: true, // Default to enabled
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

  useEffect(() => {
    if (user) {
      setLoading(true);
      initializeToggles(user.id).then(userToggles => {
        setToggles(userToggles);
        setLoading(false);
      });
    } else {
      // For logged-out users, show public features by default
      const defaultPublicToggles = Object.fromEntries(ALL_FEATURES.map(key => [key, true]));
      defaultPublicToggles[navFeatures.HOME] = true; // Always ensure Home is enabled
      setToggles(defaultPublicToggles);
      setLoading(false);
    }
  }, [user, initializeToggles]);

  const updateToggle = async (featureKey: string, isEnabled: boolean) => {
    if (!user) {
      showError("You must be logged in to change settings.");
      return;
    }

    // Optimistic update
    setToggles(prev => ({ ...prev, [featureKey]: isEnabled }));

    const { error } = await supabase
      .from('feature_toggles')
      .update({ is_enabled: isEnabled })
      .eq('user_id', user.id)
      .eq('feature_key', featureKey);

    if (error) {
      showError(`Failed to update ${featureKey}. Reverting.`);
      console.error(error);
      // Revert on failure
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