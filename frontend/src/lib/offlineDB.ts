// frontend/src/lib/offlineDB.ts
import Dexie, { Table } from 'dexie';
import { 
  OfflineClient, 
  OfflineLead, 
  OfflineProject, 
  OfflineInteraction, 
  OfflineUser,
  OfflineContact,
  SyncOperation,
  ConflictData
} from '@/types/offline';

export const DB_NAME = 'crm-db';
export const DB_VERSION = 4;

export class OfflineDatabase extends Dexie {
  clients!: Table<OfflineClient>;
  leads!: Table<OfflineLead>;
  projects!: Table<OfflineProject>;
  interactions!: Table<OfflineInteraction>;
  users!: Table<OfflineUser>;
  contacts!: Table<OfflineContact>;
  syncQueue!: Table<SyncOperation>;
  conflicts!: Table<ConflictData>;
  metadata!: Table<{ key: string; value: any }>;

  constructor() {
    super('PathSixCRM');
    
    // Version 1: Initial schema
    this.version(1).stores({
      clients: 'id, name, email, created_at, _lastModified, _syncedAt',
      leads: 'id, name, email, lead_status, created_at, _lastModified, _syncedAt',
      projects: 'id, project_name, project_status, client_id, lead_id, created_at, _lastModified, _syncedAt',
      interactions: 'id, client_id, lead_id, project_id, contact_date, follow_up, _lastModified, _syncedAt',
      syncQueue: 'id, entityType, status, timestamp, nextRetryAt',
      metadata: 'key'
    });

    // Version 2: Add conflict resolution and versioning
    this.version(2).stores({
      clients: 'id, name, email, created_at, _lastModified, _syncedAt, _version',
      leads: 'id, name, email, lead_status, created_at, _lastModified, _syncedAt, _version',
      projects: 'id, project_name, project_status, client_id, lead_id, created_at, _lastModified, _syncedAt, _version',
      interactions: 'id, client_id, lead_id, project_id, contact_date, follow_up, _lastModified, _syncedAt, _version',
      syncQueue: 'id, entityType, status, timestamp, nextRetryAt, retryCount',
      conflicts: 'operationId, entityType, entityId, timestamp',
      metadata: 'key'
    }).upgrade((trans: any) => {
      // Migration logic for existing data
      return trans.clients.toCollection().modify((client: any) => {
        if (!client._version) client._version = 1;
      }).then(() => {
        return trans.leads.toCollection().modify((lead: any) => {
          if (!lead._version) lead._version = 1;
        });
      }).then(() => {
        return trans.projects.toCollection().modify((project: any) => {
          if (!project._version) project._version = 1;
        });
      }).then(() => {
        return trans.interactions.toCollection().modify((interaction: any) => {
          if (!interaction._version) interaction._version = 1;
        });
      });
    });

    // Version 3: Add enhanced indexing for performance
    this.version(3).stores({
      clients: 'id, name, email, created_at, _lastModified, _syncedAt, _version, _pending',
      leads: 'id, name, email, lead_status, created_at, _lastModified, _syncedAt, _version, _pending',
      projects: 'id, project_name, project_status, client_id, lead_id, created_at, _lastModified, _syncedAt, _version, _pending',
      interactions: 'id, client_id, lead_id, project_id, contact_date, follow_up, _lastModified, _syncedAt, _version, _pending',
      syncQueue: 'id, entityType, status, timestamp, nextRetryAt, retryCount, localId',
      conflicts: 'operationId, entityType, entityId, timestamp',
      metadata: 'key'
    });

    this.version(4).stores({
      users: 'id, email, roles, created_at, _lastModified, _version, _pending, _deleted',
      clients: 'id, name, email, created_at, _lastModified, _syncedAt, _version, _pending, _deleted',
      leads: 'id, name, email, lead_status, created_at, _lastModified, _syncedAt, _version, _pending, _deleted',
      projects: 'id, project_name, project_status, client_id, lead_id, created_at, _lastModified, _syncedAt, _version, _pending, _deleted',
      contacts: 'id, client_id, lead_id, email, phone, created_at, _lastModified, _syncedAt, _version, _pending, _deleted',
      interactions: 'id, client_id, lead_id, project_id, contact_date, follow_up, _lastModified, _syncedAt, _version, _pending, _deleted',
      syncQueue: 'id, entityType, status, timestamp, nextRetryAt, retryCount, localId',
      conflicts: 'operationId, entityType, entityId, timestamp',
      metadata: 'key'
    });

    // Hook for cleanup operations
    this.on('populate', () => {
      // Initialize metadata
      this.metadata.add({ key: 'dbVersion', value: 3 });
      this.metadata.add({ key: 'lastSyncTime', value: null });
      this.metadata.add({ key: 'syncEnabled', value: true });
    });
  }

  // Cleanup orphaned records when parent is deleted
  async cleanupOrphanedRecords(entityType: string, entityId: number) {
    try {
      switch (entityType) {
        case 'clients':
          await this.interactions.where('client_id').equals(entityId).delete();
          await this.projects.where('client_id').equals(entityId).delete();
          await this.contacts.where('client_id').equals(entityId).delete(); // 👈 Add this
          break;

        case 'leads':
          await this.interactions.where('lead_id').equals(entityId).delete();
          await this.projects.where('lead_id').equals(entityId).delete();
          await this.contacts.where('lead_id').equals(entityId).delete(); // 👈 Add this
          break;
        
        case 'projects':
          // Clean up interactions
          await this.interactions.where('project_id').equals(entityId).delete();
          break;
      }
    } catch (error) {
      console.error('Error cleaning orphaned records:', error);
    }
  }

  // Get storage statistics
  async getStorageStats() {
    try {
      const [clientCount, leadCount, projectCount, interactionCount, userCount, queueCount] = await Promise.all([
        this.clients.count(),
        this.leads.count(),
        this.projects.count(),
        this.interactions.count(),
        this.users.count(),
        this.syncQueue.where('status').anyOf(['pending', 'failed']).count()
      ]);

      // Estimate storage (rough calculation)
      const estimate = await navigator.storage?.estimate?.();
      
      return {
        clients: clientCount,
        leads: leadCount,
        projects: projectCount,
        interactions: interactionCount,
        users: userCount,
        pendingSync: queueCount,
        storageUsed: estimate?.usage || 0,
        storageQuota: estimate?.quota || 0,
        usagePercentage: estimate ? ((estimate.usage || 0) / (estimate.quota || 1)) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        clients: 0, leads: 0, projects: 0, interactions: 0, pendingSync: 0,
        storageUsed: 0, storageQuota: 0, usagePercentage: 0
      };
    }
  }
}

// Create singleton instance
export const offlineDB = new OfflineDatabase();