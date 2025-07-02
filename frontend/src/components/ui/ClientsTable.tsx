import { Edit, Trash2, MessageCircle, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Client } from "@/types";
import { formatPhoneNumber } from "@/lib/phoneUtils";


// TEMP: All Seasons Foam prefers "Accounts" instead of "Clients"
const USE_ACCOUNT_LABELS = true;

interface ClientsTableProps {
  accounts: Client[];
  onEdit: (account: Client) => void;
  onDelete: (id: number) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export default function ClientsTable({ 
  accounts, 
  onEdit, 
  onDelete,
  sortField,
  sortDirection,
  onSort
}: ClientsTableProps) {
  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleDelete = (account: Client) => {
    if (confirm(`Are you sure you want to delete "${account.name}"?`)) {
      onDelete(account.id);
    }
  };

  const handleQuickCall = (phone: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  const handleQuickEmail = (email: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `mailto:${email}`;
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
              {USE_ACCOUNT_LABELS ? 'Account' : 'Client'} Name <span className="ml-1">{getSortIcon('name')}</span>
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('contact_person')}
            >
              Primary Contact <span className="ml-1">{getSortIcon('contact_person')}</span>
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
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
              Activity
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
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">
                  <Link
                    to={`/clients/${account.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {account.name}
                  </Link>
                </div>
                {account.address && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {account.city && account.state ? `${account.city}, ${account.state}` : account.address}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div>
                  {account.contact_person && (
                    <div className="font-medium text-gray-900">{account.contact_person}</div>
                  )}
                  {account.contact_title && (
                    <div className="text-sm text-gray-500">{account.contact_title}</div>
                  )}
                  {!account.contact_person && !account.contact_title && (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  account.type === 'Oil & Gas' ? 'bg-blue-100 text-blue-800' :
                  account.type === 'Food and Beverage' ? 'bg-green-100 text-green-800' :
                  account.type === 'Secondary Containment' ? 'bg-purple-100 text-purple-800' :
                  account.type === 'Tanks' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {account.type || 'None'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <div className="space-y-1">
                  {account.email && (
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${account.email}`} className="text-blue-600 hover:underline">
                        {account.email}
                      </a>
                      <button
                        onClick={(e) => handleQuickEmail(account.email, e)}
                        className="text-gray-400 hover:text-blue-600 p-1"
                        title="Send email"
                      >
                        <Mail size={12} />
                      </button>
                    </div>
                  )}
                  {account.phone && (
                    <div className="flex items-center gap-2">
                      <a href={`tel:${account.phone}`} className="text-blue-600 hover:underline">
                        {formatPhoneNumber(account.phone)}
                      </a>
                      {account.phone_label && (
                        <span className="text-gray-500 text-xs">({account.phone_label})</span>
                      )}
                      <button
                        onClick={(e) => handleQuickCall(account.phone, e)}
                        className="text-gray-400 hover:text-green-600 p-1"
                        title="Call"
                      >
                        <Phone size={12} />
                      </button>
                    </div>
                  )}
                  {account.secondary_phone && (
                    <div className="flex items-center gap-2">
                      <a href={`tel:${account.secondary_phone}`} className="text-blue-600 hover:underline">
                        {formatPhoneNumber(account.secondary_phone)}
                      </a>
                      {account.secondary_phone_label && (
                        <span className="text-gray-500 text-xs">({account.secondary_phone_label})</span>
                      )}
                      <button
                        onClick={(e) => handleQuickCall(account.secondary_phone!, e)}
                        className="text-gray-400 hover:text-green-600 p-1"
                        title="Call"
                      >
                        <Phone size={12} />
                      </button>
                    </div>
                  )}
                  {!account.email && !account.phone && !account.secondary_phone && (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <div className="space-y-1">
                  {/* TODO: Add interaction count and last interaction date when backend provides it */}
                  <div className="flex items-center gap-1">
                    <MessageCircle size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">— interactions</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Last: —
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {account.created_at ? new Date(account.created_at).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(account)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                    title={`Edit ${USE_ACCOUNT_LABELS ? 'account' : 'client'}`}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(account)}
                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                    title={`Delete ${USE_ACCOUNT_LABELS ? 'account' : 'client'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {accounts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No {USE_ACCOUNT_LABELS ? 'accounts' : 'clients'} found.</p>
        </div>
      )}
    </div>
  );
}