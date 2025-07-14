// src/hooks/useLocalEntityStore.ts (Fixed pagination issues)
import { useCallback } from "react";
import { offlineDB } from "@/lib/offlineDB";
import { v4 as uuidv4 } from "uuid";
import { Table } from "dexie";

type EntityType = 'clients' | 'leads' | 'projects' | 'interactions' | 'users' | "contacts";

export interface DatabaseStats {
  clients: number;
  leads: number;
  projects: number;
  interactions: number;
  pendingSync: number;
  conflicts: number;
  totalSize: number;
  lastSyncTime: Date | null;
}

export function useLocalEntityStore() {

  const createEntity = useCallback(async (type: EntityType, data: any) => {
    try {
      const id = uuidv4();
      const now = Date.now();
      const newItem = {
        ...data,
        id,
        _pending: true,
        _lastModified: now,
        _deleted: false,
        created_at: data.created_at || new Date().toISOString(),
      };
      await (offlineDB[type] as Table<any>).put(newItem);
      return { success: true, data: newItem };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }, []);

  const updateEntity = useCallback(async (type: EntityType, id: string | number, updates: any) => {
    try {
      const existing = await offlineDB[type].get(id);
      if (!existing) throw new Error("Entity not found");

      const now = Date.now();
      const updated = {
        ...existing,
        ...updates,
        _pending: true,
        _lastModified: now,
      };

      await offlineDB[type].put(updated);
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }, []);

  const deleteEntity = useCallback(async (type: EntityType, id: string | number) => {
    try {
      const existing = await (offlineDB[type] as Table<any>).get(id);
      if (!existing) throw new Error("Entity not found");

      const now = Date.now();
      const tombstone = {
        ...existing,
        _pending: true,
        _lastModified: now,
        _deleted: true,
      };

      await (offlineDB[type] as Table<any>).put(tombstone as any);
      return { success: true, data: tombstone };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }, []);

  const listEntities = useCallback(
    async (type: EntityType, { page = 1, perPage = 50 } = {}) => {
      try {
        // 🔥 CRITICAL FIX: Use proper filtering without invalid IDBKeyRange
        console.log(`📖 Loading ${type} from offline storage - page ${page}, perPage ${perPage}`);
        
        // Get all non-deleted items and apply pagination in memory
        // This is less efficient but more reliable than complex IDB queries
        const allItems = await (offlineDB[type] as Table<any>)
          .filter((item: any) => !item._deleted)
          .toArray();

        // Sort by created_at descending (newest first)
        allItems.sort((a: any, b: any) => {
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return bDate - aDate;
        });

        // Apply pagination
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedItems = allItems.slice(startIndex, endIndex);

        console.log(`📖 Found ${allItems.length} total ${type}, returning ${paginatedItems.length} for page ${page}`);

        return { 
          success: true, 
          data: { 
            items: paginatedItems, 
            total: allItems.length 
          } 
        };
      } catch (err) {
        console.error(`❌ Error loading ${type} from offline storage:`, err);
        return { success: false, error: (err as Error).message };
      }
    },
    []
  );

  const getStorageStats = async (): Promise<DatabaseStats> => {
    try {
      const [clients, leads, projects, interactions, queue, conflicts] = await Promise.all([
        offlineDB.clients.filter((c: any) => !c._deleted).count(),
        offlineDB.leads.filter((l: any) => !l._deleted).count(),
        offlineDB.projects.filter((p: any) => !p._deleted).count(),
        offlineDB.interactions.filter((i: any) => !i._deleted).count(),
        offlineDB.syncQueue.count(),
        offlineDB.conflicts.count(),
      ]);

      const totalSize = JSON.stringify({
        clients,
        leads,
        projects,
        interactions
      }).length;

      return {
        clients,
        leads,
        projects,
        interactions,
        pendingSync: queue,
        conflicts,
        totalSize,
        lastSyncTime: null,
      };
    } catch (err) {
      console.error('Error getting storage stats:', err);
      return {
        clients: 0,
        leads: 0,
        projects: 0,
        interactions: 0,
        pendingSync: 0,
        conflicts: 0,
        totalSize: 0,
        lastSyncTime: null,
      };
    }
  };

  return {
    createEntity,
    updateEntity,
    deleteEntity,
    listEntities,
    getStorageStats,
  };
}