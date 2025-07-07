// src/hooks/useLocalEntityStore.ts
import { useCallback } from "react";
import { offlineDB } from "@/lib/offlineDB";
import { v4 as uuidv4 } from "uuid";
import { Table } from "dexie";

type EntityType = 'clients' | 'leads' | 'projects' | 'interactions';

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
        const all = await ((offlineDB[type] as Table<any>)
        .where("_deleted") as any)
        .equals(false)
        .offset((page - 1) * perPage)
        .limit(perPage)
        .toArray();

        const total = await ((offlineDB[type] as Table<any>)
        .where("_deleted") as any)
        .equals(false)
        .count();

        return { success: true, data: { items: all, total } };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
    []
  );

  const getStorageStats = async (): Promise<DatabaseStats> => {
    const [clients, leads, projects, interactions, queue, conflicts] = await Promise.all([
        offlineDB.clients.count(),
        offlineDB.leads.count(),
        offlineDB.projects.count(),
        offlineDB.interactions.count(),
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
    };


    return {
    createEntity,
    updateEntity,
    deleteEntity,
    listEntities,
    getStorageStats,
    };
}
