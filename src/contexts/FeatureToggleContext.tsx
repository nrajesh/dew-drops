import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { navFeatures } from '@/config/navigation';

interface FeatureToggleContextType {
  toggles: Record<string, boolean>;
  loading: boolean;
  updateToggle: (featureKey: string, isEnabled: boolean, options?: { autoDisable?: boolean }) => Promise<void>;
  refreshToggles: () => Promise<void>;
}

const FeatureToggleContext = createContext<FeatureToggleContextType | undefined>(undefined);

export const FeatureToggleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchToggles = useCallback(async () => {
    // Step 1: Find the admin user ID. This is the owner of the canonical feature toggles.
    const { data: adminData, error: adminError } = await supabase
      .from('feature_toggles')
      .select('user_id')
      .limit(1)
      .single();

    if (adminError || !adminData) {
      console.warn("No feature toggles found in the database. Using default settings.");
      // Fallback to safe defaults if no toggles are configured at all.
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
    const adminUserId = adminData.user_id;

    // Step 2: Fetch the global toggle settings owned by the admin.
    const { data, error } = await supabase
      .from('feature_toggles')
      .select('feature_key, is_enabled, auto_disabled_until')
      .eq('user_id', adminUserId);
    
    if (error) {
      showError("Could not load website features.");
      console.error(error);
      return { [navFeatures.HOME]: true }; // Minimal safe default on error
    }

    const now = new Date();
    const globalToggles = Object.fromEntries(
      data.map(t => {
        const isTemporarilyDisabled = t.auto_disabled_until && new Date(t.auto_disabled_until) > now;
        return [t.feature_key, t.is_enabled && !isTemporarilyDisabled];
      })
    );

    globalToggles[navFeatures.HOME] = true; // Home is always on.

    // Step 3: Apply visibility rules. Hide management features for everyone except the admin.
    const isCurrentUserAdmin = user && user.id === adminUserId;

    if (!isCurrentUserAdmin) {
      Object.values(navFeatures).forEach(key => {
        if (key.startsWith('manage_') || key === navFeatures.FEATURE_TOGGLES) {
          globalToggles[key] = false;
        }
      });
    }
    
    return globalToggles;
  }, [user]);

  const refreshToggles = useCallback(async () => {
    const newToggles = await fetchToggles();
    setToggles(newToggles);
  }, [fetchToggles]);

  useEffect(() => {
    const loadAndCheckToggles = async () => {
      setLoading(true);
      // First, trigger the function to check for and re-enable any expired toggles.
      await supabase.functions.invoke('check-feature-toggles', { method: 'POST' });
      
      // Then, fetch the latest state of all toggles.
      await refreshToggles();
      setLoading(false);
    };

    loadAndCheckToggles();
  }, [user, refreshToggles]);

  const updateToggle = async (featureKey: string, isEnabled: boolean, options: { autoDisable?: boolean } = {}) => {
    if (!user) {
      showError("You must be logged in to change settings.");
      return;
    }

    // Optimistically update UI
    setToggles(prev => ({ ...prev, [featureKey]: isEnabled }));

    const updatePayload: { is_enabled: boolean; auto_disabled_until?: string | null } = {
      is_enabled: isEnabled,
    };

    if (options.autoDisable) {
      updatePayload.auto_disabled_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else {
      // A manual toggle should always clear any automatic disable timer.
      updatePayload.auto_disabled_until = null;
    }

    const { error } = await supabase
      .from('feature_toggles')
      .update(updatePayload)
      .eq('user_id', user.id) // RLS policies will ensure only the owner can update.
      .eq('feature_key', featureKey);

    if (error) {
      showError(`Failed to update ${featureKey}. Reverting.`);
      console.error(error);
      // Re-fetch to get the true state from DB
      await refreshToggles();
    } else {
      if (!options.autoDisable) {
        showSuccess("Setting saved!");
      }
    }
  };

  const value = { toggles, loading, updateToggle, refreshToggles };

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