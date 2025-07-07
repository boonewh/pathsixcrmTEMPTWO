import { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Database
} from 'lucide-react';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useLocalEntityStore } from '@/hooks/useLocalEntityStore';
import type { DatabaseStats } from '@/hooks/useLocalEntityStore';
import ConflictResolution from './ConflictResolution';

export default function OfflineStatusIndicator() {
  const { 
    networkStatus, 
    isProcessing, 
    conflicts, 
    processQueue, 
    resolveConflict 
  } = useSyncQueue();

  const { getStorageStats } = useLocalEntityStore();

  const [showDetails, setShowDetails] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [storageStats, setStorageStats] = useState<DatabaseStats | null>(null);
  const [lastSyncText, setLastSyncText] = useState('');

  // Update last sync text
  useEffect(() => {
    if (networkStatus.lastSyncTime) {
      const updateText = () => {
        const now = new Date();
        const diff = now.getTime() - networkStatus.lastSyncTime!.getTime();
        
        if (diff < 60000) {
          setLastSyncText('Just now');
        } else if (diff < 3600000) {
          const minutes = Math.floor(diff / 60000);
          setLastSyncText(`${minutes}m ago`);
        } else if (diff < 86400000) {
          const hours = Math.floor(diff / 3600000);
          setLastSyncText(`${hours}h ago`);
        } else {
          setLastSyncText(networkStatus.lastSyncTime!.toLocaleDateString());
        }
      };

      updateText();
      const interval = setInterval(updateText, 30000);
      return () => clearInterval(interval);
    } else {
      setLastSyncText('Never');
    }
  }, [networkStatus.lastSyncTime]);

  useEffect(() => {
    if (showDetails && getStorageStats) {
      getStorageStats().then(setStorageStats).catch(() => {
        setStorageStats({
          clients: 0,
          leads: 0,
          projects: 0,
          interactions: 0,
          pendingSync: 0,
          totalSize: 0,
          conflicts: 0,
          lastSyncTime: null
        });
      });
    }
  }, [showDetails, getStorageStats]);

  const handleManualSync = async () => {
    if (networkStatus.isOnline && !isProcessing) {
      try {
        await processQueue();
        // fullSync removed
      } catch (error) {
        console.error('Manual sync failed:', error);
      }
    }
  };

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="text-red-500" size={16} />;
    }

    switch (networkStatus.syncStatus) {
      case 'syncing':
        return <RefreshCw className="text-blue-500 animate-spin" size={16} />;
      case 'conflict':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'error':
        return <AlertTriangle className="text-red-500" size={16} />;
      case 'synced':
        return <CheckCircle className="text-green-500" size={16} />;
      default:
        return <Wifi className="text-gray-500" size={16} />;
    }
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) {
      return 'Offline';
    }

    switch (networkStatus.syncStatus) {
      case 'syncing':
        return isProcessing ? 'Syncing...' : 'Sync pending';
      case 'conflict':
        return `${conflicts.length} conflicts`;
      case 'error':
        return 'Sync error';
      case 'synced':
        return 'Up to date';
      case 'offline':
        return 'Offline';
      default:
        return 'Ready';
    }
  };

  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'bg-gray-100 border-gray-300';

    switch (networkStatus.syncStatus) {
      case 'syncing':
        return 'bg-blue-50 border-blue-200';
      case 'conflict':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'synced':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const pendingOperations = networkStatus.pendingOperations || 0;
  const failedOperations = networkStatus.failedOperations || 0;

  return (
    <div className="relative">
      {/* Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span className="font-semibold text-gray-900">{getStatusText()}</span>
        
        {pendingOperations > 0 && (
          <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            {pendingOperations}
          </span>
        )}
        
        {conflicts.length > 0 && (
          <span className="bg-yellow-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            !
          </span>
        )}
      </button>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Sync Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection:</span>
                <span className={networkStatus.isOnline ? 'text-green-600' : 'text-red-600'}>
                  {networkStatus.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Last sync:</span>
                <span className="text-gray-900">{lastSyncText}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Pending operations:</span>
                <span className="text-gray-900">{pendingOperations}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Failed operations:</span>
                <span className={failedOperations > 0 ? 'text-red-600' : 'text-gray-900'}>
                  {failedOperations}
                </span>
              </div>

              {conflicts.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Conflicts:</span>
                  <button
                    onClick={() => setShowConflicts(true)}
                    className="text-yellow-600 hover:text-yellow-700 font-medium"
                  >
                    {conflicts.length} pending
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Storage Stats */}
          {storageStats && (
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Database size={16} className="text-gray-500" />
                <span className="font-medium text-gray-900">Local Storage</span>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Clients:</span>
                  <span className="text-gray-900">{storageStats.clients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Leads:</span>
                  <span className="text-gray-900">{storageStats.leads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Projects:</span>
                  <span className="text-gray-900">{storageStats.projects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interactions:</span>
                  <span className="text-gray-900">{storageStats.interactions}</span>
                </div>
                
                {storageStats.totalSize > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Storage used:</span>
                      <span className="text-gray-900">
                        {(storageStats.totalSize / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 space-y-2">
            <button
              onClick={handleManualSync}
              disabled={!networkStatus.isOnline || isProcessing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
              {isProcessing ? 'Syncing...' : 'Sync Now'}
            </button>

            {conflicts.length > 0 && (
              <button
                onClick={() => setShowConflicts(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                <AlertTriangle size={16} />
                Resolve {conflicts.length} Conflicts
              </button>
            )}

            {networkStatus.lastSyncError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                <strong>Last Error:</strong> {networkStatus.lastSyncError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {showConflicts && conflicts.length > 0 && (
        <ConflictResolution
          conflicts={conflicts}
          onResolve={resolveConflict}
          onClose={() => setShowConflicts(false)}
        />
      )}
    </div>
  );
}
