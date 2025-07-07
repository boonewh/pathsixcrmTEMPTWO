// src/hooks/useAuthReady.ts - New hook to properly detect when auth is ready
import { useState, useEffect } from 'react';
import { useAuth } from '@/authContext';

export function useAuthReady() {
  const { token, user, isAuthenticated } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // If we have a token but no user yet, auth is still loading
    if (token && !user && !authChecked) {
      console.log('🔐 Auth loading: have token, waiting for user verification...');
      setAuthReady(false);
      return;
    }

    // If we have both token and user, auth is ready
    if (token && user && isAuthenticated) {
      console.log('✅ Auth ready: token + user + authenticated');
      setAuthReady(true);
      setAuthChecked(true);
      return;
    }

    // If no token, auth check is complete (not authenticated)
    if (!token) {
      console.log('❌ Auth complete: no token');
      setAuthReady(false);
      setAuthChecked(true);
      return;
    }

    // Default: not ready
    setAuthReady(false);
  }, [token, user, isAuthenticated, authChecked]);

  return {
    authReady,
    authChecked,
    canMakeAPICall: authReady && token && user && isAuthenticated
  };
}