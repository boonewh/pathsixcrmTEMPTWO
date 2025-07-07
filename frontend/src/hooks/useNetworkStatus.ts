// frontend/src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error' | 'conflict';
  pendingOperations: number;
  failedOperations: number;
  lastSyncTime: Date | null;
  lastSyncError?: string;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    syncStatus: 'synced',
    pendingOperations: 0,
    failedOperations: 0,
    lastSyncTime: null,
    lastSyncError: undefined
  });

  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: true
      }));
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        syncStatus: 'offline'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateSyncStatus = (
    status: NetworkStatus['syncStatus'], 
    pendingCount?: number,
    failedCount?: number,
    error?: string
  ) => {
    setNetworkStatus(prev => ({
      ...prev,
      syncStatus: status,
      ...(pendingCount !== undefined && { pendingOperations: pendingCount }),
      ...(failedCount !== undefined && { failedOperations: failedCount }),
      ...(error !== undefined && { lastSyncError: error }),
      ...(status === 'synced' && { lastSyncTime: new Date(), lastSyncError: undefined })
    }));
  };

  return {
    networkStatus,
    updateSyncStatus
  };
}

