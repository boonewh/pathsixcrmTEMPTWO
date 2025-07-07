// frontend/src/types/offline.ts
import { Client, Lead, Project, Interaction } from '../types';

// Base offline entity interface that extends all CRM entities
export interface OfflineEntity {
  _lastModified?: number;
  _syncedAt?: number;
  _pending?: boolean;
  _conflict?: boolean;
  _version?: number; // For conflict detection
  updated_at?: number;
}

// Enhanced sync operation with retry and conflict handling
export interface SyncOperation {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'clients' | 'leads' | 'projects' | 'interactions';
  entityId: number | string;
  localId?: string; // For CREATE operations before server assignment
  data: any;
  originalData?: any; // For conflict resolution
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed' | 'conflict' | 'skipped';
  lastError?: string;
  nextRetryAt?: number; // Exponential backoff
}

// Network status with sync queue info
export interface NetworkStatus {
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error' | 'conflict';
  pendingOperations: number;
  failedOperations: number;
  lastSyncTime: Date | null;
  lastSyncError?: string;
}

// Conflict resolution strategies
export type ConflictResolution = 'server_wins' | 'local_wins' | 'manual_merge';

export interface ConflictData {
  operationId: string;
  entityType: string;
  entityId: number;
  localData: any;
  serverData: any;
  conflictFields: string[];
  timestamp: number;
}

// Enhanced offline versions of existing entities with flexible ID types
export type OfflineClient = Omit<Client, 'id'> & OfflineEntity & { id?: number | string };
export type OfflineLead = Omit<Lead, 'id'> & OfflineEntity & { id?: number | string };
export type OfflineProject = Omit<Project, 'id'> & OfflineEntity & { id?: number | string };
export type OfflineInteraction = Omit<Interaction, 'id'> & OfflineEntity & { id?: number | string };

// Sync result for operations
export interface SyncResult {
  success: boolean;
  conflicts: ConflictData[];
  errors: Array<{ operationId: string; error: string }>;
  synced: number;
  failed: number;
}