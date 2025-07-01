import { Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Lead } from "@/types";
import { formatPhoneNumber } from "@/lib/phoneUtils";

interface LeadsTableProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  statusConfig: {
    colors: Record<string, string>;
    icons: Record<string, string>;
  };
}

export default function LeadsTable({ 
  leads, 
  onEdit, 
  onDelete,
  sortField,
  sortDirection,
  onSort,
  statusConfig
}: LeadsTableProps) {
  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleDelete = (lead: Lead) => {
    if (confirm(`Are you sure you want to delete "${lead.name}"?`)) {
      onDelete(lead.id);
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('name')}
            >
              Lead Name <span className="ml-1">{getSortIcon('name')}</span>
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('contact_person')}
            >
              Contact <span className="ml-1">{getSortIcon('contact_person')}</span>
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('lead_status')}
            >
              Status <span className="ml-1">{getSortIcon('lead_status')}</span>
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('type')}
            >
              Type <span className="ml-1">{getSortIcon('type')}</span>
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
              Contact Info
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('created_at')}
            >
              Created <span className="ml-1">{getSortIcon('created_at')}</span>
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">
                  <Link
                    to={`/leads/${lead.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {lead.name}
                  </Link>
                </div>
                {lead.address && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {lead.city && lead.state ? `${lead.city}, ${lead.state}` : lead.address}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div>
                  {lead.contact_person && (
                    <div className="font-medium text-gray-900">{lead.contact_person}</div>
                  )}
                  {lead.contact_title && (
                    <div className="text-sm text-gray-500">{lead.contact_title}</div>
                  )}
                  {!lead.contact_person && !lead.contact_title && (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  statusConfig.colors[lead.lead_status || 'open'] || 'bg-gray-100 text-gray-800'
                }`}>
                  {statusConfig.icons[lead.lead_status || 'open']} {(lead.lead_status || 'open').toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {lead.type || '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <div className="space-y-1">
                  {lead.email && (
                    <div>
                      <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div>
                      <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                        {formatPhoneNumber(lead.phone)}
                      </a>
                      {lead.phone_label && (
                        <span className="text-gray-500 text-xs ml-1">({lead.phone_label})</span>
                      )}
                    </div>
                  )}
                  {lead.secondary_phone && (
                    <div>
                      <a href={`tel:${lead.secondary_phone}`} className="text-blue-600 hover:underline">
                        {formatPhoneNumber(lead.secondary_phone)}
                      </a>
                      {lead.secondary_phone_label && (
                        <span className="text-gray-500 text-xs ml-1">({lead.secondary_phone_label})</span>
                      )}
                    </div>
                  )}
                  {!lead.email && !lead.phone && !lead.secondary_phone && (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(lead)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                    title="Edit lead"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(lead)}
                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                    title="Delete lead"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {leads.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No leads found.</p>
        </div>
      )}
    </div>
  );
}