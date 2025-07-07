import { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, GitMerge, AlertCircle } from 'lucide-react';
import { validateMergedData, getValidationErrors, ENTITY_CONFIG, EntityType } from '@/lib/validation';

// Use existing types from your offline types file
import type { ConflictData, ConflictResolution } from '@/types/offline';

interface ConflictResolutionProps {
  conflicts: ConflictData[];
  onResolve: (operationId: string, resolution: ConflictResolution, mergedData?: any) => Promise<boolean>;
  onClose: () => void;
}

interface ValidationError {
  field: string;
  message: string;
}

export default function ConflictResolutionModal({ 
  conflicts, 
  onResolve, 
  onClose 
}: ConflictResolutionProps) {
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(
    conflicts.length > 0 ? conflicts[0] : null
  );
  const [mergeMode, setMergeMode] = useState(false);
  const [mergedData, setMergedData] = useState<any>({});
  const [resolving, setResolving] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(true);

  // Validate merged data whenever it changes
  useEffect(() => {
    if (!mergeMode || !selectedConflict) {
      setValidationErrors([]);
      setIsValid(true);
      return;
    }

    try {
      validateMergedData(
        selectedConflict.entityType as EntityType,
        mergedData,
        selectedConflict.conflictFields
      );
      setValidationErrors([]);
      setIsValid(true);
    } catch (error) {
      const errors = getValidationErrors(
        selectedConflict.entityType as EntityType,
        mergedData
      );
      
      setValidationErrors(
        errors.map(errorMsg => {
          const [field, message] = errorMsg.split(': ');
          return { field, message };
        })
      );
      setIsValid(false);
    }
  }, [mergedData, mergeMode, selectedConflict]);

  if (!selectedConflict) {
    return null;
  }

  const handleResolve = async (resolution: ConflictResolution) => {
    if (resolution === 'manual_merge' && !isValid) {
      return; // Don't resolve if validation fails
    }

    setResolving(selectedConflict.operationId);
    
    try {
      const success = await onResolve(
        selectedConflict.operationId, 
        resolution,
        resolution === 'manual_merge' ? mergedData : undefined
      );
      
      if (success) {
        // Move to next conflict or close
        const remainingConflicts = conflicts.filter(c => c.operationId !== selectedConflict.operationId);
        if (remainingConflicts.length > 0) {
          setSelectedConflict(remainingConflicts[0]);
          setMergeMode(false);
          setMergedData({});
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setResolving(null);
    }
  };

  const initializeMergeData = () => {
    // Start with server data and overlay local changes
    const merged = { ...selectedConflict.serverData };
    
    // For each conflict field, default to local version
    selectedConflict.conflictFields.forEach(field => {
      merged[field] = selectedConflict.localData[field];
    });
    
    setMergedData(merged);
    setMergeMode(true);
  };

  const updateMergedField = (field: string, value: any) => {
    setMergedData((prev: Record<string, any>) => ({ ...prev, [field]: value }));
  };

  const getFieldError = (field: string): string | null => {
    const error = validationErrors.find(err => err.field === field);
    return error?.message || null;
  };

  const renderFieldComparison = (field: string) => {
    const localValue = selectedConflict.localData[field];
    const serverValue = selectedConflict.serverData[field];
    const isConflicted = selectedConflict.conflictFields.includes(field);
    const fieldError = getFieldError(field);
    
    if (!isConflicted && localValue === serverValue) {
      return null; // Don't show fields that are the same
    }

    return (
      <div key={field} className={`p-3 rounded border ${
        isConflicted ? 'border-red-200 bg-red-50' : 'border-gray-200'
      } ${fieldError ? 'border-red-400 bg-red-100' : ''}`}>
        <div className="font-medium text-sm text-gray-700 mb-2 capitalize flex items-center gap-2">
          {field.replace(/_/g, ' ')}
          {isConflicted && <span className="text-red-600">•</span>}
          {fieldError && <AlertCircle size={14} className="text-red-500" />}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-blue-600">Your Version</div>
            <div className="text-sm bg-blue-50 p-2 rounded">
              {String(localValue || '(empty)')}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs font-medium text-green-600">Server Version</div>
            <div className="text-sm bg-green-50 p-2 rounded">
              {String(serverValue || '(empty)')}
            </div>
          </div>
        </div>

        {mergeMode && isConflicted && (
          <div className="mt-2">
            <div className="text-xs font-medium text-purple-600 mb-1">Merged Value</div>
            {renderMergeInput(field, mergedData[field] || '', fieldError)}
            {fieldError && (
              <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {fieldError}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMergeInput = (field: string, value: any, hasError: string | null) => {
    const baseInputClass = `w-full text-sm border p-2 rounded focus:outline-none focus:ring-2 ${
      hasError 
        ? 'border-red-400 bg-red-50 focus:ring-red-500' 
        : 'border-purple-200 bg-purple-50 focus:ring-purple-500'
    }`;

    // Handle different field types
    if (field.includes('email')) {
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => updateMergedField(field, e.target.value)}
          className={baseInputClass}
          placeholder="Enter email address"
        />
      );
    }

    if (field.includes('phone')) {
      return (
        <input
          type="tel"
          value={value || ''}
          onChange={(e) => updateMergedField(field, e.target.value)}
          className={baseInputClass}
          placeholder="Enter phone number"
        />
      );
    }

    if (field.includes('date') || field.includes('_at')) {
      return (
        <input
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          onChange={(e) => updateMergedField(field, e.target.value ? new Date(e.target.value).toISOString() : '')}
          className={baseInputClass}
        />
      );
    }

    if (field === 'notes' || field.includes('description')) {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => updateMergedField(field, e.target.value)}
          className={baseInputClass}
          rows={3}
          placeholder="Enter notes"
        />
      );
    }

    // Default to text input
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => updateMergedField(field, e.target.value)}
        className={baseInputClass}
      />
    );
  };

  const getEntityDisplayName = (entityType: string) => {
    return ENTITY_CONFIG[entityType as EntityType]?.displayName || entityType;
  };

  const getEntityIcon = (entityType: string) => {
    return ENTITY_CONFIG[entityType as EntityType]?.icon || '📄';
  };

  const conflictIndex = conflicts.findIndex(c => c.operationId === selectedConflict.operationId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-yellow-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-yellow-600" size={24} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Sync Conflict Detected
              </h2>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <span>{getEntityIcon(selectedConflict.entityType)}</span>
                {getEntityDisplayName(selectedConflict.entityType)} #{selectedConflict.entityId} 
                has conflicting changes
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {conflictIndex + 1} of {conflicts.length}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Validation Errors Summary */}
        {mergeMode && !isValid && (
          <div className="bg-red-50 border-b border-red-200 p-4">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
              <AlertCircle size={16} />
              Validation Errors ({validationErrors.length})
            </div>
            <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>
                  <strong>{error.field}:</strong> {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              This record was modified both locally and on the server. 
              Please choose how to resolve the conflict:
            </p>
            
            <div className="text-xs text-gray-500">
              Conflict occurred: {new Date(selectedConflict.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Field Comparisons */}
          <div className="space-y-3 mb-6">
            {Object.keys({ ...selectedConflict.localData, ...selectedConflict.serverData })
              .filter(field => !field.startsWith('_') && field !== 'id')
              .map(renderFieldComparison)
              .filter(Boolean)}
          </div>

          {/* Conflict Summary */}
          <div className="bg-gray-50 p-3 rounded mb-6">
            <div className="text-sm font-medium text-gray-700 mb-1">
              Conflicting Fields: {selectedConflict.conflictFields.length}
            </div>
            <div className="text-xs text-gray-600">
              {selectedConflict.conflictFields.join(', ')}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            {conflicts.length > 1 && (
              <select
                value={selectedConflict.operationId}
                onChange={(e) => {
                  const conflict = conflicts.find(c => c.operationId === e.target.value);
                  if (conflict) {
                    setSelectedConflict(conflict);
                    setMergeMode(false);
                    setMergedData({});
                  }
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                {conflicts.map((conflict, index) => (
                  <option key={conflict.operationId} value={conflict.operationId}>
                    Conflict {index + 1}: {getEntityDisplayName(conflict.entityType)} #{conflict.entityId}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            {!mergeMode ? (
              <>
                <button
                  onClick={() => handleResolve('local_wins')}
                  disabled={resolving !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check size={16} />
                  Keep My Changes
                </button>
                
                <button
                  onClick={() => handleResolve('server_wins')}
                  disabled={resolving !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <Check size={16} />
                  Use Server Version
                </button>
                
                <button
                  onClick={initializeMergeData}
                  disabled={resolving !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  <GitMerge size={16} />
                  Merge Manually
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setMergeMode(false)}
                  disabled={resolving !== null}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel Merge
                </button>
                
                <button
                  onClick={() => handleResolve('manual_merge')}
                  disabled={resolving !== null || !isValid}
                  className={`flex items-center gap-2 px-4 py-2 rounded disabled:opacity-50 ${
                    isValid 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  title={!isValid ? 'Please fix validation errors before applying merge' : ''}
                >
                  <Check size={16} />
                  {resolving ? 'Applying...' : 'Apply Merge'}
                  {!isValid && <AlertCircle size={16} className="text-red-300" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}