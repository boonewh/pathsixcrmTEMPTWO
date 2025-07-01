import { useEffect, useState } from "react";
import EntityCard from "@/components/ui/EntityCard";
import { useAuth, userHasRole } from "@/authContext";
import { Mail, Phone, MapPin, User, StickyNote, Wrench, LayoutGrid, List, Plus, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import CompanyForm from "@/components/ui/CompanyForm";
import { Client } from "@/types";
import { apiFetch } from "@/lib/api";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";
import { useStatusFilter } from "@/hooks/useStatusFilter";
import StatusTabs from "@/components/ui/StatusTabs";
import ClientsTable from "@/components/ui/ClientsTable";
import { formatPhoneNumber } from "@/lib/phoneUtils";

// TEMP: All Seasons Foam prefers "Accounts" instead of "Clients"
const USE_ACCOUNT_LABELS = true;

// Account type options for filtering
const ACCOUNT_TYPE_OPTIONS = [
  'Oil & Gas', 'Secondary Containment', 'Tanks', 'Pipe', 
  'Rental', 'Food and Beverage', 'Bridge', 'Culvert'
] as const;

// Activity filter options
const ACTIVITY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Activity' },
  { value: 'active', label: 'Active (30 days)' },
  { value: 'inactive', label: 'Inactive (90+ days)' },
  { value: 'new', label: 'New (7 days)' }
] as const;

// Get sort options based on view mode
const getSortOptions = (viewMode: 'cards' | 'table') => {
  const base = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'alphabetical', label: 'A-Z' },
  ];

  if (viewMode === 'cards') {
    base.push({ value: 'activity', label: 'By Activity' });
  }

  return base;
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Use pagination hook with view mode support
  const {
    perPage,
    sortOrder,
    viewMode,
    currentPage,
    setCurrentPage,
    updatePerPage,
    updateSortOrder,
    updateViewMode,
  } = usePagination('clients');

  // Type filter (preserves user's filter choice)
  const { statusFilter: typeFilter, setStatusFilter: setTypeFilter } = useStatusFilter('clients_type');

  // Activity filter state (temporary, resets each session)
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Table sorting state (for table view only)
  const [tableSortField, setTableSortField] = useState('name');
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    phone_label: "work", 
    secondary_phone: "",
    secondary_phone_label: "mobile",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
    type: "None", 
  });

  const [error, setError] = useState("");
  const { token, user } = useAuth();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; email: string }[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/clients/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setClients(data.clients);
        setTotal(data.total);
        setError(""); // Reset error on successful fetch
      } catch (err) {
        setError("Failed to load accounts");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();

    if (userHasRole(user, "admin")) {
      fetch("/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setAvailableUsers(data.filter((u: any) => u.is_active)));
    }
  }, [token, currentPage, perPage, sortOrder]);

  // Advanced filtering logic
  const filteredClients = clients.filter(client => {
    // Type filter
    if (typeFilter !== 'all' && client.type !== typeFilter) return false;
    
    // Activity filter (placeholder logic - will need backend support)
    if (activityFilter === 'new') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const createdDate = new Date(client.created_at);
      if (createdDate < sevenDaysAgo) return false;
    }
    // TODO: Implement 'active' and 'inactive' filters when backend provides interaction data
    
    return true;
  });

  // Smart sorting based on view mode
  const sortedClients = viewMode === 'table' ? 
    // Table view: use table-specific sorting
    [...filteredClients].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      
      switch (tableSortField) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'contact_person':
          aVal = a.contact_person || '';
          bVal = b.contact_person || '';
          break;
        case 'type':
          aVal = a.type || '';
          bVal = b.type || '';
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        default:
          return 0;
      }
      
      if (tableSortDirection === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    }) :
    // Card view: use dropdown sorting
    (() => {
      const sorted = [...filteredClients];
      switch (sortOrder) {
        case 'newest':
          return sorted.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        case 'oldest':
          return sorted.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
        case 'alphabetical':
          return sorted.sort((a, b) => a.name.localeCompare(b.name));
        // case 'activity':
        //   // TODO: Sort by last interaction date when backend provides it
        //   return sorted;
        default:
          return sorted;
      }
    })();

  const handleTableSort = (field: string) => {
    if (tableSortField === field) {
      setTableSortDirection(tableSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortField(field);
      setTableSortDirection('asc');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      ...client,
      phone_label: client.phone_label || "work",
      secondary_phone_label: client.secondary_phone_label || "mobile",
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete this ${USE_ACCOUNT_LABELS ? 'account' : 'client'}?`)) return;

    const res = await apiFetch(`/clients/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert(`Failed to delete ${USE_ACCOUNT_LABELS ? 'account' : 'client'}`);
    }
  };

  const handleSave = async () => {
    try {
      const method = creating ? "POST" : "PUT";
      const url = creating ? "/clients/" : `/clients/${editingId}`;

      const res = await apiFetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error(`Failed to save ${USE_ACCOUNT_LABELS ? 'account' : 'client'}`);

      const updatedRes = await apiFetch(`/clients/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fullData = await updatedRes.json();
      setClients(fullData.clients);
      setTotal(fullData.total);
      handleCancel();
    } catch (err: any) {
      setError(err.message || `Failed to save ${USE_ACCOUNT_LABELS ? 'account' : 'client'}`);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setCreating(false);
    setForm({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      phone_label: "work",
      secondary_phone: "",
      secondary_phone_label: "mobile",
      address: "",
      city: "",
      state: "",
      zip: "",
      notes: "",
      type: "None",
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setTypeFilter('all');
    setActivityFilter('all');
  };

  const activeFiltersCount = [typeFilter, activityFilter].filter(f => f !== 'all').length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {USE_ACCOUNT_LABELS ? "Accounts" : "Clients"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-100 transition-colors ${
              activeFiltersCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100'
            }`}
          >
            <Filter size={16} />
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
          <button
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setForm({
                name: "",
                contact_person: "",
                email: "",
                phone: "",
                phone_label: "work",
                secondary_phone: "",
                secondary_phone_label: "mobile",
                address: "",
                city: "",
                state: "",
                zip: "",
                notes: "",
                type: "None",
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={16} />
            {`New ${USE_ACCOUNT_LABELS ? "Account" : "Client"}`}
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
              <select 
                value={activityFilter} 
                onChange={(e) => setActivityFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm bg-white"
              >
                {ACTIVITY_FILTER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Left: View Mode + Type Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button 
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'cards' 
                  ? 'bg-white shadow-sm text-blue-600 border border-gray-200' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => updateViewMode('cards')}
            >
              <LayoutGrid size={16} />
              Cards
            </button>
            <button 
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table' 
                  ? 'bg-white shadow-sm text-blue-600 border border-gray-200' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => updateViewMode('table')}
            >
              <List size={16} />
              Table
            </button>
          </div>

          {/* Type Tabs */}
          <StatusTabs 
            statusFilter={typeFilter} 
            setStatusFilter={setTypeFilter}
            items={clients}
            statusField="type"
            statusOptions={ACCOUNT_TYPE_OPTIONS}
          />
        </div>

        {/* Right: Sort Control (cards only) */}
        {viewMode === 'cards' && (
          <select 
            value={sortOrder} 
            onChange={(e) => updateSortOrder(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {getSortOptions(viewMode).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {sortedClients.length} of {clients.length} {USE_ACCOUNT_LABELS ? 'accounts' : 'clients'}
        {typeFilter !== 'all' && ` with type "${typeFilter}"`}
        {activeFiltersCount > 1 && ` (${activeFiltersCount} filters active)`}
      </div>

      {/* Pagination Controls at top */}
      <PaginationControls
        currentPage={currentPage}
        perPage={perPage}
        total={filteredClients.length}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName={USE_ACCOUNT_LABELS ? "accounts" : "clients"}
        className="border-b pb-4 mb-6"
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading {USE_ACCOUNT_LABELS ? 'accounts' : 'clients'}...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {creating && (
            <div className="w-full">
              <EntityCard
                title={USE_ACCOUNT_LABELS ? "New Account" : "New Client"}
                editing
                onSave={handleSave}
                onCancel={handleCancel}
                editForm={<CompanyForm form={form} setForm={setForm} />}
              />
            </div>
          )}

          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedClients.map((client) => (
                <div key={client.id} className="w-full">
                  <EntityCard
                    title={
                      <span className="block">
                        <Link
                          to={`/clients/${client.id}`}
                          className="hover:underline font-medium text-base block"
                        >
                          {client.name}
                        </Link>
                        <span className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Wrench size={14} className="text-gray-500" />
                          <span className="text-gray-500 font-medium">Type:</span>{" "}
                          {client.type || "None"}
                        </span>
                      </span>
                    }
                    editing={editingId === client.id}
                    onEdit={() => handleEdit(client)}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onDelete={() => handleDelete(client.id)}
                    editForm={<CompanyForm form={form} setForm={setForm} />}
                    details={
                      <ul className="text-sm text-gray-600 space-y-1">
                        {client.contact_person && (
                          <li className="flex items-start gap-2">
                            <User size={14} className="mt-[2px]" />
                            <div className="leading-tight">
                              <div>{client.contact_person}</div>
                              {client.contact_title && (
                                <div className="text-gray-500 text-sm italic">{client.contact_title}</div>
                              )}
                            </div>
                          </li>
                        )}
                        {client.email && (
                          <li className="flex items-center gap-2">
                            <Mail size={14} /> {client.email}
                          </li>
                        )}
                        {client.phone && (
                          <li className="flex items-center gap-2">
                            <Phone size={14} />
                            <span>
                              <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                                {formatPhoneNumber(client.phone)}
                              </a>
                              {client.phone_label && (
                                <span className="text-muted-foreground text-sm"> ({client.phone_label})</span>
                              )}
                            </span>
                          </li>
                        )}

                        {client.secondary_phone && (
                          <li className="flex items-center gap-2 ml-[22px]">
                            {/* indentation to align under phone icon */}
                            <span>
                              <a href={`tel:${client.secondary_phone}`} className="text-blue-600 hover:underline">
                                {formatPhoneNumber(client.secondary_phone)}
                              </a>
                              {client.secondary_phone_label && (
                                <span className="text-muted-foreground text-sm"> ({client.secondary_phone_label})</span>
                              )}
                            </span>
                          </li>
                        )}
                        {(client.address || client.city || client.state || client.zip) && (
                          <li className="flex items-start gap-2">
                            <MapPin size={14} className="mt-[2px]" />
                            <div className="leading-tight">
                              {client.address && <div>{client.address}</div>}
                              <div>
                                {[client.city, client.state].filter(Boolean).join(", ")}
                                {client.zip ? ` ${client.zip}` : ""}
                              </div>
                            </div>
                          </li>
                        )}
                        {client.notes && (
                          <li className="flex items-start gap-2">
                            <StickyNote size={14} className="mt-[2px]" />{" "}
                            <div>{client.notes}</div>
                          </li>
                        )}
                      </ul>
                    }
                    extraMenuItems={
                      userHasRole(user, "admin") ? (
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setShowAssignModal(true);
                          }}
                        >
                          Assign
                        </button>
                      ) : null
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <ClientsTable
              accounts={sortedClients}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortField={tableSortField}
              sortDirection={tableSortDirection}
              onSort={handleTableSort}
            />
          )}

          {sortedClients.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <LayoutGrid size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {USE_ACCOUNT_LABELS ? 'accounts' : 'clients'} found</h3>
              <p className="text-gray-500 mb-4">
                {activeFiltersCount > 0 
                  ? `No ${USE_ACCOUNT_LABELS ? 'accounts' : 'clients'} match your current filters. Try adjusting your search criteria.`
                  : `Get started by creating your first ${USE_ACCOUNT_LABELS ? 'account' : 'client'}.`
                }
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls at bottom */}
      <PaginationControls
        currentPage={currentPage}
        perPage={perPage}
        total={filteredClients.length}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName={USE_ACCOUNT_LABELS ? "accounts" : "clients"}
        className="border-t pt-4 mt-6"
      />

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Assign {USE_ACCOUNT_LABELS ? "Account" : "Client"}</h2>

            <select
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className="w-full border rounded px-3 py-2 mb-4"
            >
              <option value="">Select a user</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUserId(null);
                  setSelectedClientId(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                disabled={!selectedUserId}
                onClick={async () => {
                  const res = await apiFetch(`/clients/${selectedClientId}/assign`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ assigned_to: selectedUserId }),
                  });

                  if (res.ok) {
                    setShowAssignModal(false);
                    setSelectedUserId(null);
                    setSelectedClientId(null);
                    const updatedRes = await apiFetch(`/clients/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const fullData = await updatedRes.json();
                    setClients(fullData.clients);
                    setTotal(fullData.total);
                  } else {
                    alert(`Failed to assign ${USE_ACCOUNT_LABELS ? 'account' : 'client'}.`);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}