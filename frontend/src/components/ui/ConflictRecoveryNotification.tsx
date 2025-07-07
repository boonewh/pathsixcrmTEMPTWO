// src/components/ui/ConflictRecoveryNotification.tsx
import { useState, useEffect } from 'react';
import { 
  ConflictPersistence, 
  ConflictResolutionProgress,
  ConflictRecoveryNotificationProps 
} from '@/lib/conflictPersistence';

export default function ConflictRecoveryNotification({ 
  onRestore, 
  onDiscard 
}: ConflictRecoveryNotificationProps) {
  const [savedProgress, setSavedProgress] = useState<ConflictResolutionProgress[]>([]);

  useEffect(() => {
    const allProgress = ConflictPersistence.getAllProgress();
    setSavedProgress(Object.values(allProgress));
  }, []);

  if (savedProgress.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Unsaved Conflict Resolution Found
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            You have {savedProgress.length} conflict{savedProgress.length > 1 ? 's' : ''} with unsaved resolution progress.
          </p>
          
          <div className="space-y-2">
            {savedProgress.map((progress) => (
              <div key={progress.operationId} className="flex items-center justify-between bg-white rounded p-2">
                <div className="text-sm">
                  <span className="font-medium">
                    {progress.entityType} #{progress.entityId}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({progress.step})
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRestore(progress)}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={onDiscard}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Discard all saved progress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}