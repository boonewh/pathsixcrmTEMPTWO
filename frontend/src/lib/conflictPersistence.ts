// src/lib/conflictPersistence.ts
import { useState, useEffect, useCallback } from 'react';
import { ConflictData } from '@/types/offline';

export interface ConflictResolutionProgress {
  operationId: string;
  entityType: string;
  entityId: number;
  step: 'reviewing' | 'merging' | 'validating';
  mergedData?: any;
  lastModified: number;
  conflictFields: string[];
  originalLocalData: any;
  originalServerData: any;
}

export class ConflictPersistence {
  private static readonly STORAGE_KEY = 'crm_conflict_progress';
  private static readonly MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Save conflict resolution progress to localStorage
   */
  static saveProgress(progress: ConflictResolutionProgress): void {
    try {
      const existing = this.getAllProgress();
      existing[progress.operationId] = {
        ...progress,
        lastModified: Date.now()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
      console.log(`Saved conflict progress for operation ${progress.operationId}`);
    } catch (error) {
      console.error('Failed to save conflict progress:', error);
    }
  }

  /**
   * Get conflict resolution progress for a specific operation
   */
  static getProgress(operationId: string): ConflictResolutionProgress | null {
    try {
      const allProgress = this.getAllProgress();
      const progress = allProgress[operationId];
      
      if (!progress) return null;
      
      // Check if progress has expired
      const age = Date.now() - progress.lastModified;
      if (age > this.MAX_AGE) {
        this.clearProgress(operationId);
        return null;
      }
      
      return progress;
    } catch (error) {
      console.error('Failed to get conflict progress:', error);
      return null;
    }
  }

  /**
   * Get all conflict resolution progress
   */
  static getAllProgress(): Record<string, ConflictResolutionProgress> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return {};
      
      const parsed: Record<string, ConflictResolutionProgress> = JSON.parse(stored);
      
      // Clean up expired entries
      const now = Date.now();
      const validEntries: [string, ConflictResolutionProgress][] = [];
      
      for (const [key, progress] of Object.entries(parsed)) {
        if (progress && typeof progress === 'object' && 'lastModified' in progress) {
          const age = now - (progress.lastModified || 0);
          if (age <= this.MAX_AGE) {
            validEntries.push([key, progress]);
          }
        }
      }
      
      const filtered = Object.fromEntries(validEntries);
      
      // Save cleaned data back
      if (Object.keys(filtered).length !== Object.keys(parsed).length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      }
      
      return filtered;
    } catch (error) {
      console.error('Failed to get all conflict progress:', error);
      return {};
    }
  }

  /**
   * Clear specific conflict resolution progress
   */
  static clearProgress(operationId: string): void {
    try {
      const existing = this.getAllProgress();
      delete existing[operationId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
      console.log(`Cleared conflict progress for operation ${operationId}`);
    } catch (error) {
      console.error('Failed to clear conflict progress:', error);
    }
  }

  /**
   * Clear all conflict resolution progress
   */
  static clearAllProgress(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('Cleared all conflict progress');
    } catch (error) {
      console.error('Failed to clear all conflict progress:', error);
    }
  }

  /**
   * Get list of all operations with saved progress
   */
  static getProgressOperationIds(): string[] {
    return Object.keys(this.getAllProgress());
  }

  /**
   * Check if there's any saved progress
   */
  static hasAnyProgress(): boolean {
    return Object.keys(this.getAllProgress()).length > 0;
  }

  /**
   * Get progress summary for debugging/monitoring
   */
  static getProgressSummary(): {
    totalOperations: number;
    oldestProgress: number | null;
    newestProgress: number | null;
    operationsByEntityType: Record<string, number>;
  } {
    const allProgress = this.getAllProgress();
    const entries = Object.values(allProgress);
    
    if (entries.length === 0) {
      return {
        totalOperations: 0,
        oldestProgress: null,
        newestProgress: null,
        operationsByEntityType: {}
      };
    }
    
    const timestamps = entries.map(p => p.lastModified);
    const entityTypeCounts = entries.reduce((acc, progress) => {
      acc[progress.entityType] = (acc[progress.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalOperations: entries.length,
      oldestProgress: Math.min(...timestamps),
      newestProgress: Math.max(...timestamps),
      operationsByEntityType: entityTypeCounts
    };
  }

  /**
   * Create progress object from conflict data
   */
  static createProgress(
    operationId: string,
    conflictData: ConflictData,
    step: ConflictResolutionProgress['step'] = 'reviewing',
    mergedData?: any
  ): ConflictResolutionProgress {
    return {
      operationId,
      entityType: conflictData.entityType,
      entityId: conflictData.entityId,
      step,
      mergedData,
      lastModified: Date.now(),
      conflictFields: conflictData.conflictFields || [],
      originalLocalData: conflictData.localData,
      originalServerData: conflictData.serverData
    };
  }

  /**
   * Update existing progress
   */
  static updateProgress(
    operationId: string,
    updates: Partial<Omit<ConflictResolutionProgress, 'operationId' | 'lastModified'>>
  ): boolean {
    try {
      const existing = this.getProgress(operationId);
      if (!existing) return false;
      
      const updated = {
        ...existing,
        ...updates,
        lastModified: Date.now()
      };
      
      this.saveProgress(updated);
      return true;
    } catch (error) {
      console.error('Failed to update conflict progress:', error);
      return false;
    }
  }
}

// Hook for using conflict persistence in React components
export function useConflictPersistence(operationId: string | null) {
  const [progress, setProgress] = useState<ConflictResolutionProgress | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load progress on mount or when operationId changes
  useEffect(() => {
    if (!operationId) {
      setProgress(null);
      setHasUnsavedChanges(false);
      return;
    }

    const savedProgress = ConflictPersistence.getProgress(operationId);
    setProgress(savedProgress);
    setHasUnsavedChanges(!!savedProgress);
  }, [operationId]);

  // Save progress
  const saveProgress = useCallback((progressData: ConflictResolutionProgress) => {
    ConflictPersistence.saveProgress(progressData);
    setProgress(progressData);
    setHasUnsavedChanges(true);
  }, []);

  // Update progress
  const updateProgress = useCallback((
    updates: Partial<Omit<ConflictResolutionProgress, 'operationId' | 'lastModified'>>
  ) => {
    if (!operationId) return false;
    
    const success = ConflictPersistence.updateProgress(operationId, updates);
    if (success) {
      const updated = ConflictPersistence.getProgress(operationId);
      setProgress(updated);
      setHasUnsavedChanges(true);
    }
    return success;
  }, [operationId]);

  // Clear progress
  const clearProgress = useCallback(() => {
    if (!operationId) return;
    
    ConflictPersistence.clearProgress(operationId);
    setProgress(null);
    setHasUnsavedChanges(false);
  }, [operationId]);

  // Create initial progress
  const createProgress = useCallback((
    conflictData: ConflictData,
    step: ConflictResolutionProgress['step'] = 'reviewing',
    mergedData?: any
  ) => {
    if (!operationId) return null;
    
    const progressData = ConflictPersistence.createProgress(operationId, conflictData, step, mergedData);
    saveProgress(progressData);
    return progressData;
  }, [operationId, saveProgress]);

  return {
    progress,
    hasUnsavedChanges,
    saveProgress,
    updateProgress,
    clearProgress,
    createProgress
  };
}

// Utility hook for warning about unsaved changes
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = 'You have unsaved conflict resolution progress. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}

// Export types and interfaces for use in React components
export interface ConflictRecoveryNotificationProps {
  onRestore: (progress: ConflictResolutionProgress) => void;
  onDiscard: () => void;
}