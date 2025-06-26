import React, { useState, useEffect } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '@/authContext';
import { apiFetch } from '@/lib/api';

interface User {
  id: number;
  email: string;
  is_active: boolean;
}

interface ImportResult {
  message: string;
  successful_imports: number;
  failed_imports: number;
  failures: Array<{
    row: number;
    plant_name: string;
    error: string;
  }>;
}

export default function LeadImporter() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await apiFetch('/users/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(data.filter((u: User) => u.is_active));
      } catch (err) {
        setError('Failed to load users');
      }
    };
    loadUsers();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['.csv', '.xlsx'];
      const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
      
      if (!validTypes.includes(fileExtension)) {
        setError('Please upload a CSV or Excel (.xlsx) file');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file || !selectedUser) {
      setError('Please select a file and user');
      return;
    }

    setIsUploading(true);
    setError('');
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assigned_user_email', selectedUser);

      // Updated route to avoid conflicts
      const res = await fetch('https://pathsix-backend.fly.dev/api/import/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        // Handle non-JSON error responses
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || 'Import failed');
        } else {
          // Server returned HTML error page
          throw new Error(`Server error: ${res.status} ${res.statusText}`);
        }
      }

      const data = await res.json();
      setImportResult(data);
      setFile(null);
      setSelectedUser('');
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      // Updated route to match backend
      const res = await fetch('https://pathsix-backend.fly.dev/api/import/leads/template', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to download template');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lead_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Leads
        </h3>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-2">Import Instructions:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload a CSV or Excel file with lead data</li>
          <li>• Required columns: PLANT_NAME, ADDRESS, CITY, STATE</li>
          <li>• Optional columns: OWNER_NAME, PHONE, SIC_DESC, CONTACT TITLE, CONTACT FIRST NAME, CONTACT LAST NAME, CONTACT EMAIL</li>
          <li>• All leads will be assigned to the selected user</li>
          <li>• PLANT_NAME becomes the lead name, SIC_DESC and OWNER_NAME go into notes</li>
        </ul>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Import Form */}
      <div className="space-y-6">
        {/* User Selection */}
        <div>
          <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-2">
            Assign leads to user:
          </label>
          <select
            id="user-select"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a user...</option>
            {users.map((user) => (
              <option key={user.id} value={user.email}>
                {user.email}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
            Upload file:
          </label>
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={!file || !selectedUser || isUploading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Import Leads
            </>
          )}
        </button>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h4 className="font-medium text-green-900">Import Completed</h4>
          </div>
          <p className="text-green-800 mb-2">{importResult.message}</p>
          <div className="text-sm text-green-700">
            <p>✅ Successfully imported: {importResult.successful_imports} leads</p>
            {importResult.failed_imports > 0 && (
              <p>❌ Failed imports: {importResult.failed_imports}</p>
            )}
          </div>

          {/* Show failures if any */}
          {importResult.failures && importResult.failures.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowModal(true)}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                View failed imports ({importResult.failures.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Failures Modal */}
      {showModal && importResult?.failures && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">Failed Imports</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-80">
              <div className="space-y-3">
                {importResult.failures.map((failure, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="font-medium text-red-900">
                      Row {failure.row}: {failure.plant_name}
                    </p>
                    <p className="text-sm text-red-700">{failure.error}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}