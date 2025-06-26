import { Database } from 'lucide-react';
import LeadImporter from '@/components/ui/LeadImporter';

export default function AdminImportPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Database className="h-8 w-8" />
          Data Import
        </h1>
        <p className="mt-2 text-gray-600">
          Import leads and other data into the CRM system.
        </p>
      </div>

      {/* Lead Import Section */}
      <div className="mb-8">
        <LeadImporter />
      </div>

      {/* Future import sections can be added here */}
      {/* 
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Client Import</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600">Client import feature coming soon...</p>
        </div>
      </div>
      */}
    </div>
  );
}