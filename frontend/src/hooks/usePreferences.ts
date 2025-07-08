import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/authContext';
import { apiFetch, backgroundApiFetch } from '@/lib/api'; // 🔥 Import backgroundApiFetch
import { useAuthReady } from '@/hooks/useAuthReady';

interface PaginationPreferences {
  perPage: number;
  sort: 'newest' | 'oldest' | 'alphabetical';
  viewMode: 'cards' | 'table';
}

interface UserPreferences {
  pagination: Record<string, PaginationPreferences>;
  display: {
    sidebar_collapsed: boolean;
    theme: 'light' | 'dark';
  };
}

// Local storage keys for offline fallback
const PREFERENCES_STORAGE_KEY = 'crm_user_preferences';
const getUserPreferencesKey = (userId?: number) => `${PREFERENCES_STORAGE_KEY}_${userId || 'guest'}`;

export function usePreferences() {
  const { token, user } = useAuth();
  const { canMakeAPICall } = useAuthReady();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    if (!token || !user) return;

    const loadPreferences = async () => {
      try {
        setError(null);
        
        // Try to load from server first if online
        if (canMakeAPICall) {
          try {
            const res = await backgroundApiFetch('/preferences/', {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (res.ok) {
              const data = await res.json();
              setPreferences(data);
              
              // Save to localStorage as backup
              const storageKey = getUserPreferencesKey(user.id);
              localStorage.setItem(storageKey, JSON.stringify(data));
              
              console.log('📋 Loaded preferences from server');
              setLoading(false);
              return;
            }
          } catch (serverError) {
            console.warn('⚠️ Failed to load preferences from server:', serverError);
            // Fall through to localStorage
          }
        }

        // Load from localStorage
        const storageKey = getUserPreferencesKey(user.id);
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
          try {
            const parsedPrefs = JSON.parse(saved);
            setPreferences(parsedPrefs);
            console.log('💾 Loaded preferences from localStorage');
          } catch (parseError) {
            console.warn('Failed to parse saved preferences:', parseError);
            // Use defaults if parsing fails
            setPreferences({
              pagination: {},
              display: { sidebar_collapsed: false, theme: 'light' }
            });
          }
        } else {
          // Set defaults if no saved preferences
          setPreferences({
            pagination: {},
            display: { sidebar_collapsed: false, theme: 'light' }
          });
          console.log('📋 Using default preferences');
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
        setError('Failed to load preferences');
        // Set defaults if loading fails
        setPreferences({
          pagination: {},
          display: { sidebar_collapsed: false, theme: 'light' }
        });
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [token, user, canMakeAPICall]);

  // Update pagination preferences for a specific table
  const updatePaginationPrefs = useCallback(async (
    tableName: string, 
    prefs: PaginationPreferences
  ) => {
    if (!token || !preferences || !user) return;

    // Optimistic update
    const previousPrefs = preferences.pagination[tableName];
    const updatedPreferences = {
      ...preferences,
      pagination: {
        ...preferences.pagination,
        [tableName]: prefs
      }
    };
    
    setPreferences(updatedPreferences);

    // Always save to localStorage immediately
    const storageKey = getUserPreferencesKey(user.id);
    localStorage.setItem(storageKey, JSON.stringify(updatedPreferences));

    // 🔥 Try to save to server using backgroundApiFetch (no toast errors)
    if (canMakeAPICall) {
      try {
        const res = await backgroundApiFetch(`/preferences/pagination/${tableName}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(prefs),
        });

        if (res.ok) {
          console.log(`📋 Saved preferences for ${tableName} to server`);
        } else {
          console.log(`💾 Saved preferences for ${tableName} to localStorage only (server failed)`);
        }
      } catch (error) {
        // 🔥 Silently fail - localStorage is our fallback, no toast errors
        console.log(`💾 Saved preferences for ${tableName} to localStorage only (offline)`);
        // Don't rollback or show error - localStorage save succeeded
      }
    } else {
      console.log(`💾 Saved preferences for ${tableName} to localStorage (offline)`);
    }
  }, [token, preferences, user, canMakeAPICall]);

  // Get pagination preferences for a specific table
  const getPaginationPrefs = useCallback((tableName: string): PaginationPreferences => {
    const defaults = { perPage: 10, sort: 'newest' as const, viewMode: 'cards' as const };
    return preferences?.pagination?.[tableName] || defaults;
  }, [preferences]);

  return {
    preferences,
    loading,
    error,
    updatePaginationPrefs,
    getPaginationPrefs,
  };
}

// Hook specifically for pagination
export function usePagination(tableName: string) {
  const { getPaginationPrefs, updatePaginationPrefs, loading } = usePreferences();
  const prefs = getPaginationPrefs(tableName);
  
  const [currentPage, setCurrentPage] = useState(1);

  const updatePrefs = useCallback((newPrefs: Partial<PaginationPreferences>) => {
    const updated = { ...prefs, ...newPrefs };
    updatePaginationPrefs(tableName, updated);
    setCurrentPage(1); // Reset to first page when preferences change
  }, [tableName, prefs, updatePaginationPrefs]);

  return {
    perPage: prefs.perPage,
    sortOrder: prefs.sort,
    viewMode: prefs.viewMode,
    currentPage,
    setCurrentPage,
    updatePerPage: (perPage: number) => updatePrefs({ perPage }),
    updateSortOrder: (sort: 'newest' | 'oldest' | 'alphabetical') => updatePrefs({ sort }),
    updateViewMode: (viewMode: 'cards' | 'table') => updatePrefs({ viewMode }),
    isLoading: loading,
  };
}