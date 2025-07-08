// frontend/src/hooks/useSyncQueue.ts (Fixed with Better Offline Handling)
import { useState, useCallback, useEffect, useRef } from 'react';
import { offlineDB } from '@/lib/offlineDB';
import { SyncOperation, ConflictData, ConflictResolution } from '@/types/offline';
import { backgroundApiFetch } from '@/lib/api'; // 🔥 Use backgroundApiFetch instead
import { useAuth } from '@/authContext';
import { useNetworkStatus } from './useNetworkStatus';
import type { EntityType } from '@/lib/validation';

export type SyncErrorType = 'network' | 'validation' | 'conflict' | 'permission' | 'server' | 'unknown';

// Extend SyncOperation with additional runtime properties for enhanced functionality
interface ExtendedSyncOperation extends SyncOperation {
  backoffMultiplier?: number;
  firstFailedAt?: number;
  errorType?: SyncErrorType;
}

export interface SyncMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageRetryCount: number;
  errorsByType: Record<SyncErrorType, number>;
  oldestPendingOperation: number | null;
}

const RETRY_CONFIG = {
  DEFAULT_MAX_RETRIES: 5,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 5 * 60 * 1000, // 5 minutes
  NETWORK_ERROR_MULTIPLIER: 2,
  SERVER_ERROR_MULTIPLIER: 3,
  VALIDATION_ERROR_MULTIPLIER: 1, // Don't retry validation errors aggressively
  PERMISSION_ERROR_MULTIPLIER: 10, // Long delay for permission errors
} as const;

export function useSyncQueue() {
  const { token, isAuthenticated } = useAuth();
  const { networkStatus, updateSyncStatus } = useNetworkStatus();
  const [isProcessing, setIsProcessing] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [metrics, setMetrics] = useState<SyncMetrics>({
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageRetryCount: 0,
    errorsByType: {
      network: 0,
      validation: 0,
      conflict: 0,
      permission: 0,
      server: 0,
      unknown: 0
    },
    oldestPendingOperation: null
  });
  const [syncingEntities, setSyncingEntities] = useState<string[]>([]);
  const processingRef = useRef(false);
  const autoProcessTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🔥 NEW: Check if we can sync (online AND authenticated)
  const canSync = networkStatus.isOnline && isAuthenticated && token;

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = async () => {
      try {
        const allOps = await offlineDB.syncQueue.toArray();
        const completed = allOps.filter(op => op.status === 'completed');
        const failed = allOps.filter(op => op.status === 'failed');
        const pending = allOps.filter(op => op.status === 'pending' || op.status === 'syncing');
        
        const errorsByType: Record<SyncErrorType, number> = {
          network: 0,
          validation: 0,
          conflict: 0,
          permission: 0,
          server: 0,
          unknown: 0
        };

        allOps.forEach(op => {
          const extOp = op as ExtendedSyncOperation;
          if (extOp.errorType) {
            errorsByType[extOp.errorType]++;
          }
        });

        const avgRetryCount = allOps.length > 0 
          ? allOps.reduce((sum, op) => sum + (op.retryCount || 0), 0) / allOps.length 
          : 0;

        const oldestPending = pending.length > 0 
          ? Math.min(...pending.map(op => op.timestamp)) 
          : null;

        setMetrics({
          totalOperations: allOps.length,
          successfulOperations: completed.length,
          failedOperations: failed.length,
          averageRetryCount: avgRetryCount,
          errorsByType,
          oldestPendingOperation: oldestPending
        });
      } catch (error) {
        console.error('Failed to update sync metrics:', error);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [isProcessing]);

  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function syncEntity(type: EntityType): Promise<void> {
    // 🔥 CRITICAL FIX: Don't sync when offline
    if (!canSync) {
      console.log(`⏸️ Skipping sync for ${type} - offline or not authenticated`);
      return;
    }

    try {
      console.log(`🔄 Syncing ${type}...`);
      updateSyncStatus('syncing');

      // Step 1: Push all queued operations for this entity
      const pendingOps = await offlineDB.syncQueue
        .where('entityType')
        .equals(type)
        .and(op => ['pending', 'failed'].includes(op.status))
        .toArray();

      for (const op of pendingOps) {
        const table = offlineDB[type];
        if (!table) continue;

        const existing = await table.get(op.entityId);
        if (
          existing &&
          typeof existing.updated_at === 'number' &&
          typeof op.timestamp === 'number' &&
          existing.updated_at >= op.timestamp
        ) {
          console.log(`⏩ Skipping stale op ${op.id} for ${type}#${op.entityId}`);
          await offlineDB.syncQueue.update(op.id, { status: 'skipped' });
          continue;
        }

        try {
          await offlineDB.syncQueue.update(op.id, { status: 'syncing' });
          const { success, errorType, error } = await processSingleOperation(op);
          if (success) {
            await offlineDB.syncQueue.update(op.id, { status: 'completed' });
          } else {
            const retryCount = (op.retryCount || 0) + 1;
            const delay = calculateRetryDelay(retryCount, errorType);
            await offlineDB.syncQueue.update(op.id, {
              status: 'failed',
              retryCount,
              nextRetryAt: Date.now() + delay,
              errorType,
              lastError: error
            } as Partial<ExtendedSyncOperation>);
          }
        } catch (err) {
          console.error(`🔁 Failed to process queued op for ${type}:`, err);
        }
      }

      // Step 2: Pull fresh data from server and store it
      const res = await backgroundApiFetch(`/${type}/?page=1&per_page=100`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to sync ${type}: ${res.status} ${text}`);
      }

      const data = await res.json();
      const table = (offlineDB as any)[type];
      await table.clear();

      const items = Array.isArray(data[type]) ? data[type] : [];
      await table.bulkPut(
        items.map((item: any) => ({
          ...item,
          _lastModified: Date.now(),
          _syncedAt: Date.now(),
          _pending: false,
          _version: 1,
        }))
      );
      updateSyncStatus('synced', undefined, undefined);
      console.log(`✅ Synced ${type} — ${items.length} items`);
    } catch (err: any) {
      console.error(`❌ Sync failed for ${type}:`, err);
      updateSyncStatus('error', undefined, undefined, `${type}: ${err.message || err}`);
    } finally {
      setSyncingEntities(prev => prev.filter(t => t !== type));
    }
  }

  // Queue an operation for sync with enhanced retry config
  const queueOperation = useCallback(async (
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: 'clients' | 'leads' | 'projects' | 'interactions',
    entityId: number | string,
    data: any,
    localId?: string
  ): Promise<string> => {
    const operationId = `${entityType}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const syncOp: SyncOperation = {
      id: operationId,
      operation,
      entityType,
      entityId,
      localId,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: RETRY_CONFIG.DEFAULT_MAX_RETRIES,
      nextRetryAt: Date.now(),
      lastError: ''
    };

    try {
      await offlineDB.syncQueue.add(syncOp);
      console.log(`Queued ${operation} for ${entityType}:${entityId}`, { operationId });
      
      // Update network status
      const pendingCount = await offlineDB.syncQueue.where('status').anyOf(['pending', 'failed']).count();
      updateSyncStatus(canSync ? 'syncing' : 'offline', pendingCount);
      
      // 🔥 Only process immediately if we can actually sync
      if (canSync && !processingRef.current) {
        // Small delay to allow UI to update
        if (autoProcessTimeoutRef.current) {
          clearTimeout(autoProcessTimeoutRef.current);
        }
        autoProcessTimeoutRef.current = setTimeout(() => processQueue(), 100);
      }
      
      return operationId;
    } catch (error) {
      console.error('Failed to queue operation:', error);
      throw error;
    }
  }, [canSync, updateSyncStatus]);

  // Calculate next retry delay with exponential backoff
  const calculateRetryDelay = (
    retryCount: number, 
    errorType: SyncErrorType,
    baseDelay: number = RETRY_CONFIG.BASE_DELAY
  ): number => {
    const multiplierMap: Record<SyncErrorType, number> = {
      network: RETRY_CONFIG.NETWORK_ERROR_MULTIPLIER,
      server: RETRY_CONFIG.SERVER_ERROR_MULTIPLIER,
      validation: RETRY_CONFIG.VALIDATION_ERROR_MULTIPLIER,
      permission: RETRY_CONFIG.PERMISSION_ERROR_MULTIPLIER,
      conflict: RETRY_CONFIG.NETWORK_ERROR_MULTIPLIER,
      unknown: RETRY_CONFIG.NETWORK_ERROR_MULTIPLIER
    };

    const multiplier = multiplierMap[errorType];
    
    const delay = Math.min(
      baseDelay * Math.pow(multiplier, retryCount),
      RETRY_CONFIG.MAX_DELAY
    );

    // Add jitter to prevent thundering herd
    const jitter = delay * 0.1 * Math.random();
    return Math.round(delay + jitter);
  };

  // Classify error type based on response
  const classifyError = (_error: any, response?: Response): SyncErrorType => {
    if (!response) {
      // Network error (fetch failed)
      return 'network';
    }

    switch (response.status) {
      case 400:
      case 422:
        return 'validation';
      case 401:
      case 403:
        return 'permission';
      case 409:
        return 'conflict';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'server';
      default:
        return 'unknown';
    }
  };

  const processQueue = useCallback(async (): Promise<void> => {
    if (conflicts.length > 0) {
      console.warn("⏸️ Queue paused due to unresolved conflicts.");
      updateSyncStatus("conflict");
      return;
    }

    // 🔥 CRITICAL FIX: Don't process queue when offline
    if (!canSync || processingRef.current) {
      console.log("⏸️ Skipping queue processing - offline or already processing");
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    updateSyncStatus('syncing');

    try {
      const entityTypes: EntityType[] = ['clients', 'leads', 'projects', 'interactions'];

      for (const type of entityTypes) {
        // 🔥 Check if still online before each entity
        if (!canSync) {
          console.log("⏸️ Going offline mid-sync, stopping...");
          break;
        }
        
        setSyncingEntities(prev => [...prev, type]);
        await syncEntity(type);
        await delay(1000); // wait 1 second between entities (reduced from 5)
      }

      const allConflicts = await offlineDB.conflicts.toArray();
      setConflicts(allConflicts);

      const remaining = await offlineDB.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .count();

      const finalStatus = allConflicts.length > 0
        ? 'conflict'
        : remaining > 0
        ? 'syncing'
        : 'synced';

      updateSyncStatus(finalStatus, remaining);
    } catch (err) {
      console.error('🔁 Queue processing failed:', err);
      updateSyncStatus('error');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      setSyncingEntities([]);
    }
  }, [canSync, updateSyncStatus]);

  // Process a single sync operation with enhanced error handling
  const processSingleOperation = async (
    op: SyncOperation
  ): Promise<{ success: boolean; errorType: SyncErrorType; error: string }> => {
    try {
      const endpoint = getEndpointForEntity(op.entityType);
      let response: Response;

      switch (op.operation) {
        case 'CREATE':
          response = await backgroundApiFetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(op.data),
          });

          if (response.ok) {
            const serverData = await response.json();
            if (op.localId && serverData.id) {
              await updateLocalEntityWithServerId(op.entityType, op.localId, serverData.id, serverData);
            }
            return { success: true, errorType: 'unknown', error: '' };
          }
          break;

        case 'UPDATE':
          response = await backgroundApiFetch(`${endpoint}/${op.entityId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(op.data),
          });

          if (response.ok) {
            return { success: true, errorType: 'unknown', error: '' };
          } else if (response.status === 409) {
            const serverData = await response.json();
            await handleConflict(op, serverData);
            return { success: false, errorType: 'conflict', error: 'Data conflict detected' };
          }
          break;

        case 'DELETE':
          response = await backgroundApiFetch(`${endpoint}/${op.entityId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok || response.status === 404) {
            return { success: true, errorType: 'unknown', error: '' };
          }
          break;
      }

      const errorType = classifyError(null, response!);
      let errorMessage = `HTTP ${response!.status}`;

      try {
        const errorText = await response!.text();
        errorMessage = errorText || errorMessage;
      } catch {}

      return { success: false, errorType, error: errorMessage };
    } catch (networkError) {
      const errorType: SyncErrorType = 'network';
      const errorMessage = networkError instanceof Error ? networkError.message : 'Network error';

      return { success: false, errorType, error: errorMessage };
    }
  };

  // Handle conflict detection and storage
  const handleConflict = async (op: SyncOperation, serverData: any) => {
    const conflictData: ConflictData = {
      operationId: op.id,
      entityType: op.entityType,
      entityId: Number(op.entityId),
      localData: op.data,
      serverData,
      conflictFields: findConflictFields(op.data, serverData),
      timestamp: Date.now(),
    };

    await offlineDB.conflicts.add(conflictData);
    await offlineDB.syncQueue.update(op.id, { status: 'conflict' });
  };

  // Resolve a conflict with chosen strategy
  const resolveConflict = useCallback(async (
    operationId: string, 
    resolution: ConflictResolution,
    mergedData?: any
  ): Promise<boolean> => {
    // 🔥 Check if we can sync before resolving
    if (!canSync) {
      console.warn('Cannot resolve conflict while offline or unauthenticated');
      return false;
    }

    try {
      const conflict = await offlineDB.conflicts.where('operationId').equals(operationId).first();
      const operation = await offlineDB.syncQueue.get(operationId);
      
      if (!conflict || !operation) {
        throw new Error('Conflict or operation not found');
      }

      let finalData: any;
      
      switch (resolution) {
        case 'server_wins':
          finalData = conflict.serverData;
          break;
        case 'local_wins':
          finalData = conflict.localData;
          break;
        case 'manual_merge':
          if (!mergedData) throw new Error('Merged data required for manual resolution');
          finalData = mergedData;
          break;
      }

      // Apply the resolution
      const endpoint = getEndpointForEntity(operation.entityType);
      const response = await backgroundApiFetch(`${endpoint}/${operation.entityId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(finalData)
      });

      if (response.ok) {
        // Update local data
        await updateLocalEntity(operation.entityType, Number(operation.entityId), finalData);
        
        // Remove conflict and mark operation as completed
        await offlineDB.conflicts.delete(operationId);
        await offlineDB.syncQueue.update(operationId, { status: 'completed' });
        
        // Update conflicts state
        const remainingConflicts = await offlineDB.conflicts.toArray();
        setConflicts(remainingConflicts);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return false;
    }
  }, [canSync, token]);

  // 🔥 Auto-process queue when we become able to sync (was offline/unauthenticated, now can sync)
  useEffect(() => {
    if (canSync && !processingRef.current) {
      // Wait a bit for network/auth to stabilize
      if (autoProcessTimeoutRef.current) {
        clearTimeout(autoProcessTimeoutRef.current);
      }
      
      autoProcessTimeoutRef.current = setTimeout(() => {
        processQueue().catch(console.warn);
      }, 2000);
    }

    // Cleanup timeout
    return () => {
      if (autoProcessTimeoutRef.current) {
        clearTimeout(autoProcessTimeoutRef.current);
        autoProcessTimeoutRef.current = null;
      }
    };
  }, [canSync, processQueue]);

  // 🔥 REDUCED FREQUENCY: Process queue periodically when we can sync
  useEffect(() => {
    if (!canSync) return; // Only run when we can sync

    const interval = setInterval(async () => {
      if (!processingRef.current) {
        const pendingCount = await offlineDB.syncQueue.where('status').anyOf(['pending', 'failed']).count();
        if (pendingCount > 0) {
          processQueue();
        }
      }
    }, 60000); // 🔥 CHANGED: Check every 60 seconds instead of 30

    return () => clearInterval(interval);
  }, [canSync, processQueue]);

  // Helper functions
  const getEndpointForEntity = (entityType: string): string => {
    switch (entityType) {
      case 'clients': return '/clients';
      case 'leads': return '/leads';
      case 'projects': return '/projects';
      case 'interactions': return '/interactions';
      default: throw new Error(`Unknown entity type: ${entityType}`);
    }
  };

  const findConflictFields = (localData: any, serverData: any): string[] => {
    const fields: string[] = [];
    for (const key in localData) {
      if (localData[key] !== serverData[key]) {
        fields.push(key);
      }
    }
    return fields;
  };

  const updateLocalEntityWithServerId = async (
    entityType: string, 
    localId: string, 
    serverId: number, 
    serverData: any
  ) => {
    const table = (offlineDB as any)[entityType];
    await table.where('id').equals(localId).modify({
      id: serverId,
      ...serverData,
      _syncedAt: Date.now(),
      _pending: false
    });
  };

  const updateLocalEntity = async (entityType: string, entityId: number, data: any) => {
    const table = (offlineDB as any)[entityType];
    await table.update(entityId, {
      ...data,
      _syncedAt: Date.now(),
      _pending: false
    });
  };

  // Clean completed operations (run periodically)
  const cleanupCompletedOperations = useCallback(async () => {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    const deletedCount = await offlineDB.syncQueue
      .where('status')
      .equals('completed')
      .and(op => op.timestamp < cutoffTime)
      .delete();
      
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old completed operations`);
    }
  }, []);

  // Force retry failed operations (admin function)
  const forceRetryFailedOperations = useCallback(async () => {
    const failedOps = await offlineDB.syncQueue.where('status').equals('failed').toArray();
    
    for (const op of failedOps) {
      await offlineDB.syncQueue.update(op.id, {
        status: 'pending',
        retryCount: 0,
        nextRetryAt: Date.now()
      });
    }
    
    console.log(`Reset ${failedOps.length} failed operations for retry`);
    
    // 🔥 Only process if we can sync
    if (canSync) {
      processQueue();
    }
  }, [canSync, processQueue]);

  return {
    queueOperation,
    processQueue,
    syncEntity,
    resolveConflict,
    cleanupCompletedOperations,
    forceRetryFailedOperations,
    isProcessing,
    conflicts,
    networkStatus,
    metrics,
    canSync, // 🔥 Expose this for debugging
    syncingEntities,
  };
}