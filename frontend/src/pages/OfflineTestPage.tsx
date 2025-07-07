import { useState, useEffect } from 'react';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useAuth } from '@/authContext';
import { useAuthReady } from "@/hooks/useAuthReady";
import { useLocalEntityStore } from "@/hooks/useLocalEntityStore";
import toast from 'react-hot-toast';
import { 
  Wifi, 
  WifiOff, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw,  
  AlertTriangle,
  Database,
  Activity
} from 'lucide-react';

interface TestEntity {
  id: string | number;
  name: string;
  email: string;
  notes: string;
  created_at: string;
  _pending?: boolean;
  _lastModified?: number;
}

export default function OfflineTestPage() {

  const { token } = useAuth();
  const { authReady } = useAuthReady();

  // Don't load offline hooks until we have a token
  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading authentication...</p>
        </div>
      </div>
    );
  }

  const {
    createEntity,
    updateEntity,
    deleteEntity,
    listEntities,
    getStorageStats,
  } = useLocalEntityStore();
  
  const { 
    processQueue, 
    syncEntity,
    isProcessing, 
    conflicts, 
    networkStatus,
    metrics, syncingEntities } = useSyncQueue();

  // Local state
  const [testData, setTestData] = useState<TestEntity[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [stats, setStats] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('📡 Connection restored - will attempt to sync');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addLog('📴 Connection lost - working offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load test data on mount
  useEffect(() => {
    loadTestData();
    loadStats();
  }, []);

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]); // Keep last 20 entries
  };

  // Load test data from offline DB
  const loadTestData = async () => {
    try {
      const result = await listEntities('clients', { page: 1, perPage: 100 });
      if (result.success && result.data) {
        const testClients = result.data.items.filter((c: any) => 
          c.name?.startsWith('Test') || c.email?.includes('test@')
        );
        setTestData(testClients as TestEntity[]);
        addLog(`📊 Loaded ${testClients.length} test records from offline DB`);
      } else {
        addLog(`❌ Error loading test data: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error loading test data: ${error}`);
    }
  };

  // Load storage stats
  const loadStats = async () => {
    try {
      const storageStats = await getStorageStats();
      setStats(storageStats);
    } catch (error) {
      addLog(`❌ Error loading stats: ${error}`);
    }
  };

  // Create new test entity
  const handleCreate = async () => {
    if (!formData.name || !formData.email) {
      addLog('❌ Name and email are required');
      return;
    }

    try {
      const clientData = {
        name: `Test ${formData.name}`,
        email: formData.email.includes('@') ? formData.email : `${formData.email}@test.com`,
        notes: formData.notes || 'Created via offline test',
        contact_person: 'Test User',
        phone: '+1-555-TEST',
        address: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zip: '12345'
      };

      const result = await createEntity('clients', clientData);
      if (result.success) {
        addLog(`✅ Created test record: ${clientData.name} (ID: ${result.data?.id})`);
        setFormData({ name: '', email: '', notes: '' });
        await loadTestData();
        await loadStats();
      } else {
        addLog(`❌ Error creating record: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error creating record: ${error}`);
    }
  };

  // Update existing entity
  const handleUpdate = async () => {
    if (!editingId || !formData.name || !formData.email) return;

    try {
      const updates = {
        name: `Test ${formData.name}`,
        email: formData.email,
        notes: formData.notes
      };

      const result = await updateEntity('clients', editingId, updates);
      if (result.success) {
        addLog(`✅ Updated record: ${updates.name} (ID: ${editingId})`);
        setEditingId(null);
        setFormData({ name: '', email: '', notes: '' });
        await loadTestData();
        await loadStats();
      } else {
        addLog(`❌ Error updating record: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error updating record: ${error}`);
    }
  };

  // Delete entity
  const handleDelete = async (id: string | number, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;

    try {
      const result = await deleteEntity('clients', id);
      if (result.success) {
        addLog(`🗑️ Deleted record: ${name} (ID: ${id})`);
        await loadTestData();
        await loadStats();
      } else {
        addLog(`❌ Error deleting record: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error deleting record: ${error}`);
    }
  };

  // Start editing
  const startEdit = (entity: TestEntity) => {
    setEditingId(entity.id);
    setFormData({
      name: entity.name?.replace('Test ', '') || '',
      email: entity.email || '',
      notes: entity.notes || ''
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', notes: '' });
  };

  // Manual sync
  const handleSync = async () => {
    console.log("🧠 DEBUG: authReady =", authReady);

    if (!authReady) {
      addLog("⏳ Sync not ready — still waiting on authentication.");
      toast.error("Cannot sync yet. Wait for authentication.");
      return;
    }

    try {
      addLog('🔄 Starting manual sync...');
      await processQueue();
      await loadTestData();
      await loadStats();
      addLog('✅ Manual sync completed');
    } catch (error) {
      addLog(`❌ Sync error: ${error}`);
    }
  };

  // Simulate going offline
  const simulateOffline = () => {
    // This is just for demo - in real testing, use browser dev tools
    addLog('💡 To test offline mode: Open browser dev tools → Network tab → Check "Offline"');
  };

  // Clear test data
  const clearTestData = async () => {
    if (!confirm('Delete all test records?')) return;

    try {
      for (const entity of testData) {
        await deleteEntity('clients', entity.id);
      }
      addLog('🧹 Cleared all test records');
      await loadTestData();
      await loadStats();
    } catch (error) {
      addLog(`❌ Error clearing test data: ${error}`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Offline Database Test</h1>
        <p className="text-gray-600">
          Test the offline functionality by creating, editing, and deleting records. 
          Use browser dev tools to simulate going offline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Panel */}
        <div className="space-y-4">
          {syncingEntities.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-2 rounded mb-2 flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              Syncing: {syncingEntities.join(", ")}
            </div>
          )}
          {/* Network Status */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              {isOnline ? (
                <Wifi className="text-green-500" size={20} />
              ) : (
                <WifiOff className="text-red-500" size={20} />
              )}
              <h3 className="font-medium">Network Status</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Connection:</span>
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sync Status:</span>
                <span className="capitalize">{networkStatus.syncStatus}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending Ops:</span>
                <span>{metrics.totalOperations}</span>
              </div>
              <div className="flex justify-between">
                <span>Conflicts:</span>
                <span className={conflicts.length > 0 ? 'text-yellow-600' : 'text-gray-600'}>
                  {conflicts.length}
                </span>
              </div>
            </div>
          </div>

          {/* Storage Stats */}
          {stats && (
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="text-blue-500" size={20} />
                <h3 className="font-medium">Storage Stats</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Clients:</span>
                  <span>{stats.clients}</span>
                </div>
                <div className="flex justify-between">
                  <span>Leads:</span>
                  <span>{stats.leads}</span>
                </div>
                <div className="flex justify-between">
                  <span>Projects:</span>
                  <span>{stats.projects}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interactions:</span>
                  <span>{stats.interactions}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium mb-3">Test Actions</h3>
            <div className="space-y-2">
              {/* Full Sync */}
              <button
                onClick={handleSync}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
                {isProcessing ? 'Syncing...' : 'Manual Sync'}
              </button>

              {/* Per-Entity Retry */}
              <div className="text-sm text-gray-700 font-medium mt-2">Retry Single Entity</div>
              {['clients', 'leads', 'projects', 'interactions'].map((type) => (
                <button
                  key={type}
                  onClick={async () => {
                    addLog(`🔁 Retrying sync for ${type}...`);
                    try {
                      await syncEntity(type as any);
                      addLog(`✅ Sync complete for ${type}`);
                      await loadTestData();
                      await loadStats();
                    } catch (err) {
                      addLog(`❌ Sync failed for ${type}: ${err}`);
                    }
                  }}
                  className="w-full px-3 py-1 rounded text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                >
                  Sync {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}

              {/* Simulate Offline */}
              <button
                onClick={simulateOffline}
                className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                How to Go Offline
              </button>

              {/* Clear Test Data */}
              <button
                onClick={clearTestData}
                className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear Test Data
              </button>
            </div>
          </div>


        {/* Data Management */}
        <div className="space-y-4">
          {/* Create/Edit Form */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium mb-3">
              {editingId ? 'Edit Record' : 'Create Test Record'}
            </h3>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
              />
              
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
              />
              
              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
              
              <div className="flex gap-2">
                {editingId ? (
                  <>
                    <button
                      onClick={handleUpdate}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Update
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCreate}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    Create
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Test Records */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium mb-3">Test Records ({testData.length})</h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testData.map((entity) => (
                <div 
                  key={entity.id} 
                  className={`p-3 border rounded-md ${
                    entity._pending ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{entity.name}</span>
                        {entity._pending && (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                            <AlertTriangle size={12} />
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 truncate">{entity.email}</div>
                      {entity.notes && (
                        <div className="text-xs text-gray-500 truncate">{entity.notes}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => startEdit(entity)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(entity.id, entity.name)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {testData.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No test records yet. Create some above!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="text-green-500" size={20} />
              <h3 className="font-medium">Activity Log</h3>
            </div>
            
            <div className="space-y-1 max-h-96 overflow-y-auto text-sm font-mono">
              {log.map((entry, index) => (
                <div key={index} className="text-gray-700 break-words">
                  {entry}
                </div>
              ))}
              
              {log.length === 0 && (
                <div className="text-gray-500 text-center py-4">
                  Activity will appear here...
                </div>
              )}
            </div>
            
            <button
              onClick={() => setLog([])}
              className="mt-3 w-full px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              Clear Log
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Testing Instructions</h4>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Create some test records above</li>
              <li>2. Open browser dev tools (F12)</li>
              <li>3. Go to Network tab → Check "Offline"</li>
              <li>4. Create/edit/delete more records</li>
              <li>5. Uncheck "Offline" to go back online</li>
              <li>6. Watch the sync happen automatically</li>
            </ol>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
