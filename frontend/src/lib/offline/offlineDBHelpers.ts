import { openDB } from 'idb';
import { DB_NAME, DB_VERSION } from '../offlineDB';


export async function getPendingOperations(entityType: string) {
  const db = await openDB(DB_NAME, DB_VERSION);
  return db.getAllFromIndex('sync_queue', 'by_entity', entityType);
}

export async function markOperationAsSynced(operationId: string) {
  const db = await openDB(DB_NAME, DB_VERSION);
  await db.delete('sync_queue', operationId);
}

export async function replaceEntityData(entityType: string, data: any[]) {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(entityType, 'readwrite');
  await tx.store.clear();
  for (const item of data) {
    await tx.store.put(item);
  }
  await tx.done;
}
