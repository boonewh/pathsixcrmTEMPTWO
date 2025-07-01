import { useEffect, useState } from "react";
import EntityCard from "@/components/ui/EntityCard";
import { Mail, Phone, MapPin, Flag, User, StickyNote, Wrench } from "lucide-react";
import { useAuth, userHasRole } from "@/authContext";
import { Link } from "react-router-dom";
import LeadForm from "@/components/ui/LeadForm";
import { Lead } from "@/types";
import { apiFetch } from "@/lib/api";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";
import { useStatusFilter } from "@/hooks/useStatusFilter";
import StatusTabs from "@/components/ui/StatusTabs";
import LeadsTable from "@/components/ui/LeadsTable";
import { LayoutGrid, List, Plus, Filter } from "lucide-react";

// Configurable lead statuses - easily customizable per client
const LEAD_STATUS_CONFIG = {
  statuses: ['open', 'qualified', 'proposal', 'closed'] as const,
  colors: {
    open: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-orange-100 text-orange-800', 
    proposal: 'bg-blue-100 text-blue-800',
    closed: 'bg-red-100 text-red-800'
  },
  icons: {
    open: '🟡',
    qualified: '🟠',
    proposal: '🔵', 
    closed: '🔴'
  }
};

// Configurable lead sources - easily customizable per industry
const LEAD_SOURCE_OPTIONS = [
  'Website', 'Referral', 'Cold Call', 'Email Campaign', 
  'Social Media', 'Trade Show', 'Advertisement', 'Partner', 'Other'
] as const;

// Configurable lead temperature - universal concept
const LEAD_TEMPERATURE_CONFIG = {
  temperatures: ['hot', 'warm', 'cold'] as const,
  colors: {
    hot: 'text-red-600',
    warm: 'text-orange-600',
    cold: 'text-blue-600'
  },
  icons: {
    hot: '🔥',
    warm: '☀️',
    cold: '❄️'
  }
};


export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
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
  } = usePagination('leads');

  // Status filter (preserves user's filter choice)
  const { statusFilter, setStatusFilter } = useStatusFilter('leads');

  // Advanced filters - only enable when features are ready
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [temperatureFilter, setTemperatureFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Check if advanced filters should be shown (when we have actual filterable data)
  const hasAdvancedFilters = false; // Set to true when source/temperature are implemented

  // Table sorting state (for table view only)
  const [tableSortField, setTableSortField] = useState('name');
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc');

  const [currentlyEditingId, setCurrentlyEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<Lead>>({
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
    lead_status: "open",
    notes: "",
    type: "None",
  });

  const { token, user } = useAuth();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; email: string }[]>([]);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/leads/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
        setError("");
      } catch (err) {
        setError("Failed to load leads");
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();

    if (userHasRole(user, "admin")) {
      fetch("/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setAvailableUsers(data.filter((u: any) => u.is_active)));
    }
  }, [token, currentPage, perPage, sortOrder]);

  // Advanced filtering logic (currently only status filter works)
  const filteredLeads = leads.filter(lead => {
    // Status filter
    if (statusFilter !== 'all' && lead.lead_status !== statusFilter) return false;
    
    // Source filter (when implemented) 
    // if (sourceFilter !== 'all' && lead.lead_source !== sourceFilter) return false;
    
    // Temperature filter (when implemented)
    // if (temperatureFilter !== 'all' && lead.lead_temperature !== temperatureFilter) return false;
    
    return true;
  });

  // Smart sorting based on view mode
  const sortedLeads = viewMode === 'table' ? 
    // Table view: use table-specific sorting
    [...filteredLeads].sort((a, b) => {
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
        case 'lead_status':
          aVal = a.lead_status || '';
          bVal = b.lead_status || '';
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
      const sorted = [...filteredLeads];
      switch (sortOrder) {
        case 'newest':
          return sorted.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        case 'oldest':
          return sorted.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
        case 'alphabetical':
          return sorted.sort((a, b) => a.name.localeCompare(b.name));
        // case 'status':
        //   return sorted.sort((a, b) => (a.lead_status || '').localeCompare(b.lead_status || ''));
        // case 'temperature':
        //   // Sort by temperature when implemented
        //   return sorted;
        // case 'activity':
        //   // Sort by recent activity when implemented
          return sorted;
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

  const handleEdit = (lead: Lead) => {
    setCurrentlyEditingId(lead.id);
    setForm({
      ...lead,
      phone_label: lead.phone_label || "work",
      secondary_phone_label: lead.secondary_phone_label || "mobile",
    });
  };

  const handleCancel = () => {
    setCurrentlyEditingId(null);
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
      lead_status: "open",
      notes: "",
      type: "None",
    });
  };

  const handleSave = async () => {
    const method = creating ? "POST" : "PUT";
    const url = creating ? "/leads/" : `/leads/${currentlyEditingId}`;

    const res = await apiFetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });

    if (!res.ok) return alert("Failed to save lead");

    const updatedRes = await apiFetch(`/leads/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const fullData = await updatedRes.json();
    setLeads(fullData.leads);
    setTotal(fullData.total);

    handleCancel();
  };

  const handleDelete = async (id: number) => {
    const res = await apiFetch(`/leads/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLeads((prev) => prev.filter((l) => l.id !== id));
    else alert("Failed to delete lead");
  };

  // Clear all filters (currently only status filter)
  const clearAllFilters = () => {
    setStatusFilter('all');
    // setSourceFilter('all');      // Enable when source filter is ready
    // setTemperatureFilter('all'); // Enable when temperature filter is ready
  };

  const activeFiltersCount = [statusFilter].filter(f => f !== 'all').length; // Only count implemented filters

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex gap-2">
          {hasAdvancedFilters && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-100 transition-colors ${
                activeFiltersCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100'
              }`}
            >
              <Filter size={16} />
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>
          )}
          <button
            onClick={() => {
              setCreating(true);
              setCurrentlyEditingId(null);
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
                lead_status: "open",
                notes: "",
                type: "None",
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={16} />
            New Lead
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Advanced Filters Panel - Hidden until features are implemented */}
      {hasAdvancedFilters && showAdvancedFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select 
                value={sourceFilter} 
                onChange={(e) => setSourceFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm bg-white"
              >
                <option value="all">All Sources</option>
                {LEAD_SOURCE_OPTIONS.map(source => (
                  <option key={source} value={source.toLowerCase()}>{source}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <select 
                value={temperatureFilter} 
                onChange={(e) => setTemperatureFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm bg-white"
              >
                <option value="all">All Temperatures</option>
                {LEAD_TEMPERATURE_CONFIG.temperatures.map(temp => (
                  <option key={temp} value={temp}>
                    {LEAD_TEMPERATURE_CONFIG.icons[temp]} {temp.charAt(0).toUpperCase() + temp.slice(1)}
                  </option>
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
        {/* Left: View Mode + Status Filters */}
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

          {/* Status Tabs */}
          <StatusTabs 
            statusFilter={statusFilter} 
            setStatusFilter={setStatusFilter}
            items={leads}
            statusField="lead_status"
            statusOptions={LEAD_STATUS_CONFIG.statuses}
          />
        </div>

      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {sortedLeads.length} of {leads.length} leads
        {statusFilter !== 'all' && ` with status "${statusFilter}"`}
        {activeFiltersCount > 1 && ` (${activeFiltersCount} filters active)`}
      </div>

      {/* Pagination Controls at top */}
      <PaginationControls
        currentPage={currentPage}
        perPage={perPage}
        total={filteredLeads.length}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName="leads"
        className="border-b pb-4 mb-6"
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading leads...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {creating && (
            <div className="w-full">
              <EntityCard
                title="New Lead"
                editing
                onSave={handleSave}
                onCancel={handleCancel}
                                    editForm={<LeadForm form={form} setForm={setForm} />}
              />
            </div>
          )}

          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedLeads.map((lead) => (
                <div key={lead.id} className="w-full">
                  <EntityCard
                    title={
                      <span className="block">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="hover:underline font-medium text-base block"
                        >
                          {lead.name}
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Wrench size={14} className="text-gray-500" />
                          <span className="text-gray-500 font-medium">Type:</span>{" "}
                          {lead.type || "None"}
                        </div>
                      </span>
                    }
                    editing={currentlyEditingId === lead.id}
                    onEdit={() => handleEdit(lead)}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onDelete={() => handleDelete(lead.id)}
                    editForm={<LeadForm form={form} setForm={setForm} />}
                    details={
                      <ul className="text-sm text-gray-600 space-y-1">
                        {lead.contact_person && (
                          <li className="flex items-start gap-2">
                            <User size={14} className="mt-[2px]" />
                            <div className="leading-tight">
                              <div>{lead.contact_person}</div>
                              {lead.contact_title && (
                                <div className="text-gray-500 text-sm italic">{lead.contact_title}</div>
                              )}
                            </div>
                          </li>
                        )}
                        {lead.email && (
                          <li className="flex items-center gap-2">
                            <Mail size={14} /> {lead.email}
                          </li>
                        )}
                        {lead.phone && (
                          <li className="flex items-start gap-2">
                            <Phone size={14} className="mt-[2px]" />
                            <div className="leading-tight">
                              <div>
                                <a href={`tel:${lead.phone}`} className="text-blue-600 underline">
                                  {lead.phone}
                                </a>
                                {lead.phone_label && (
                                  <span className="text-muted-foreground text-sm ml-1">
                                    ({lead.phone_label})
                                  </span>
                                )}
                              </div>
                              {lead.secondary_phone && (
                                <div>
                                  <a
                                    href={`tel:${lead.secondary_phone}`}
                                    className="text-blue-600 underline"
                                  >
                                    {lead.secondary_phone}
                                  </a>
                                  {lead.secondary_phone_label && (
                                    <span className="text-muted-foreground text-sm ml-1">
                                      ({lead.secondary_phone_label})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        )}
                        {(lead.address || lead.city || lead.state || lead.zip) && (
                          <li className="flex items-start gap-2">
                            <MapPin size={14} className="mt-[2px]" />
                            <div className="leading-tight">
                              {lead.address && <div>{lead.address}</div>}
                              <div>
                                {[lead.city, lead.state].filter(Boolean).join(", ")}
                                {lead.zip ? ` ${lead.zip}` : ""}
                              </div>
                            </div>
                          </li>
                        )}
                        {lead.lead_status && (
                          <li className="flex items-center gap-2">
                            <Flag size={14} />
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              LEAD_STATUS_CONFIG.colors[lead.lead_status as keyof typeof LEAD_STATUS_CONFIG.colors] || 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {LEAD_STATUS_CONFIG.icons[lead.lead_status as keyof typeof LEAD_STATUS_CONFIG.icons]} 
                              {lead.lead_status.toUpperCase()}
                            </span>
                          </li>
                        )}
                        {lead.notes && (
                          <li className="flex items-start gap-2">
                            <StickyNote size={14} className="mt-[2px]" />
                            <div>{lead.notes}</div>
                          </li>
                        )}
                      </ul>
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <LeadsTable
              leads={sortedLeads}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortField={tableSortField}
              sortDirection={tableSortDirection}
              onSort={handleTableSort}
              statusConfig={LEAD_STATUS_CONFIG}
            />
          )}

          {sortedLeads.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <LayoutGrid size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-500 mb-4">
                {activeFiltersCount > 0 
                  ? "No leads match your current filters. Try adjusting your search criteria."
                  : "Get started by creating your first lead."
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
        total={filteredLeads.length}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName="leads"
        className="border-t pt-4 mt-6"
      />

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Assign Lead</h2>

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
                  setSelectedLeadId(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                disabled={!selectedUserId}
                onClick={async () => {
                  const res = await apiFetch(`/leads/${selectedLeadId}/assign`, {
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
                    setSelectedLeadId(null);
                    const updatedRes = await apiFetch(`/leads/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const fullData = await updatedRes.json();
                    setLeads(fullData.leads);
                    setTotal(fullData.total);
                  } else {
                    alert("Failed to assign lead.");
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