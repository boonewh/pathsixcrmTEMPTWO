import { useEffect, useState } from 'react';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useLocalEntityStore } from '@/hooks/useLocalEntityStore';
import { Wifi, WifiOff, Database, AlertTriangle } from 'lucide-react';

export default function InfoPage() {
  const { networkStatus, metrics, conflicts, syncingEntities } = useSyncQueue();
  const { getStorageStats } = useLocalEntityStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [stats, setStats] = useState<any>(null);

  // Watch online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load local storage stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const storageStats = await getStorageStats();
        setStats(storageStats);
      } catch (err) {
        setStats(null);
      }
    };
    loadStats();
  }, [getStorageStats]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">System Info</h1>

      {/* Connection Status */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          {isOnline ? <Wifi className="text-green-500" size={20} /> : <WifiOff className="text-red-500" size={20} />}
          <h2 className="font-medium">Network Status</h2>
        </div>
        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex justify-between">
            <span>Connection:</span>
            <span className={isOnline ? 'text-green-600' : 'text-red-600'}>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="flex justify-between">
            <span>Sync Status:</span>
            <span className="capitalize">{networkStatus.syncStatus}</span>
          </div>
          <div className="flex justify-between">
            <span>Pending Sync Operations:</span>
            <span>{metrics.totalOperations}</span>
          </div>
          <div className="flex justify-between">
            <span>Currently Syncing:</span>
            <span>{syncingEntities.join(', ') || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Conflicts:</span>
            <span className={conflicts.length > 0 ? 'text-yellow-600' : 'text-gray-600'}>{conflicts.length}</span>
          </div>
        </div>
      </div>

      {/* Storage Info */}
      {stats && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Database className="text-blue-500" size={20} />
            <h2 className="font-medium">Local Storage</h2>
          </div>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex justify-between">
              <span>Clients:</span>
              <span>{stats.clients}</span>
            </div>
            <div className="flex justify-between">
              <span>Leads:</span>
              <span>{stats.leads}</span>
            </div>
            <div className="flex justify-between">
              <span>Projects:</span>
              <span>{stats.projects}</span>
            </div>
            <div className="flex justify-between">
              <span>Interactions:</span>
              <span>{stats.interactions}</span>
            </div>
          </div>
        </div>
      )}

      {/* Offline Warning */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5" />
          <div>
            <p className="font-medium mb-1">You're working offline</p>
            <p className="text-sm">Any changes you make will be saved locally and synced when your connection is restored.</p>
          </div>
        </div>
      )}
    </div>
  );
}
