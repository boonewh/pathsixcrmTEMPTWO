import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/authContext';
import { apiFetch } from '@/lib/api';

interface PaginationPreferences {
  perPage: number;
  sort: 'newest' | 'oldest' | 'alphabetical';
  viewMode: 'cards' | 'table';  // NEW: Add viewMode support
}

interface UserPreferences {
  pagination: Record<string, PaginationPreferences>;
  display: {
    sidebar_collapsed: boolean;
    theme: 'light' | 'dark';
  };
}

export function usePreferences() {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    if (!token) return;

    const loadPreferences = async () => {
      try {
        setError(null);
        const res = await apiFetch('/preferences/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          setPreferences(data);
        } else {
          // Set defaults if preferences don't exist yet
          setPreferences({
            pagination: {},
            display: { sidebar_collapsed: false, theme: 'light' }
          });
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
  }, [token]);

  // Update pagination preferences for a specific table
  const updatePaginationPrefs = useCallback(async (
    tableName: string, 
    prefs: PaginationPreferences
  ) => {
    if (!token || !preferences) return;

    // Optimistic update
    const previousPrefs = preferences.pagination[tableName];
    setPreferences(prev => prev ? {
      ...prev,
      pagination: {
        ...prev.pagination,
        [tableName]: prefs
      }
    } : null);

    try {
      const res = await apiFetch(`/preferences/pagination/${tableName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(prefs),
      });

      if (!res.ok) {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Failed to update pagination preferences:', error);
      // Rollback on error
      setPreferences(prev => prev ? {
        ...prev,
        pagination: {
          ...prev.pagination,
          [tableName]: previousPrefs || { perPage: 10, sort: 'newest', viewMode: 'cards' }
        }
      } : null);
    }
  }, [token, preferences]);

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
    viewMode: prefs.viewMode,  // NEW: Expose viewMode
    currentPage,
    setCurrentPage,
    updatePerPage: (perPage: number) => updatePrefs({ perPage }),
    updateSortOrder: (sort: 'newest' | 'oldest' | 'alphabetical') => updatePrefs({ sort }),
    updateViewMode: (viewMode: 'cards' | 'table') => updatePrefs({ viewMode }),  // NEW: Add viewMode updater
    isLoading: loading,
  };
}