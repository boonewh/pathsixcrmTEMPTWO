import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import EntityCard from "@/components/ui/EntityCard";
import { Project } from "@/types";
import ProjectForm from "@/components/ui/ProjectForm";
import { FormWrapper } from "@/components/ui/FormWrapper";
import { apiFetch } from "@/lib/api";
import { Link } from "react-router-dom";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";
import { useStatusFilter } from "@/hooks/useStatusFilter";
import StatusTabs from "@/components/ui/StatusTabs";
import ProjectsTable from "@/components/ui/ProjectsTable";
import { LayoutGrid, List, Plus } from "lucide-react";

// TEMP: All Seasons Foam prefers "Accounts" instead of "Clients"
const USE_ACCOUNT_LABELS = true;

// Project status options for filtering
const PROJECT_STATUS_OPTIONS = ['pending', 'won', 'lost'] as const;

// Get sort options based on view mode
const getSortOptions = (viewMode: 'cards' | 'table') => {
  const base = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'alphabetical', label: 'A-Z' },
  ];

  if (viewMode === 'cards') {
    base.push({ value: 'value', label: 'By Value' });
  }

  return base;
};

export default function Projects() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
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
  } = usePagination('projects');

  // Status filter (temporary, resets each session)
  const { statusFilter, setStatusFilter } = useStatusFilter('projects');

  // Table sorting state (for table view only)
  const [tableSortField, setTableSortField] = useState('project_name');
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc');

  const [form, setForm] = useState<Partial<Project>>({});
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [leads, setLeads] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [projRes, clientRes, leadRes] = await Promise.all([
          apiFetch(`/projects/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
          apiFetch("/clients/", { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch("/leads/", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const projectsData = await projRes.json();
        const clients = await clientRes.json();
        const leads = await leadRes.json();

        const leadsArray = leads.leads || leads;
        const clientsArray = clients.clients || clients;

        setProjects(projectsData.projects);
        setTotal(projectsData.total);
        setClients(clientsArray.map((c: any) => ({ id: c.id, name: c.name })));
        setLeads(leadsArray.map((l: any) => ({ id: l.id, name: l.name })));
      } catch (err: any) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [token, currentPage, perPage, sortOrder]);

  // Filter projects by status
  const filteredProjects = projects.filter(project => {
    if (statusFilter === 'all') return true;
    return project.project_status === statusFilter;
  });

  // Sort projects based on view mode
  const sortedProjects = viewMode === 'table' ? 
    // Table view: use table-specific sorting
    [...filteredProjects].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      
      switch (tableSortField) {
        case 'project_name':
          aVal = a.project_name || '';
          bVal = b.project_name || '';
          break;
        case 'project_status':
          aVal = a.project_status || '';
          bVal = b.project_status || '';
          break;
        case 'type':
          aVal = a.type || '';
          bVal = b.type || '';
          break;
        case 'project_worth':
          return tableSortDirection === 'asc' 
            ? (a.project_worth || 0) - (b.project_worth || 0)
            : (b.project_worth || 0) - (a.project_worth || 0);
        case 'entity':
          aVal = a.client_name || a.lead_name || a.primary_contact_name || '';
          bVal = b.client_name || b.lead_name || b.primary_contact_name || '';
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
      const sorted = [...filteredProjects];
      switch (sortOrder) {
        case 'newest':
          return sorted.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        case 'oldest':
          return sorted.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
        case 'alphabetical':
          return sorted.sort((a, b) => a.project_name.localeCompare(b.project_name));
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

  const resetForm = () => {
    setForm({});
    setCreating(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const method = creating ? "POST" : "PUT";
    const url = creating ? "/projects/" : `/projects/${editingId}`;

    if (!form.project_worth) {
      form.project_worth = 0;
    }
    
    const res = await apiFetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const updated = await apiFetch(`/projects/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await updated.json();
      setProjects(data.projects);
      setTotal(data.total);
      resetForm();
    }
  };

  const handleDelete = async (id: number) => {
    const res = await apiFetch(`/projects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    } else {
      alert("Failed to delete project");
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setForm(project);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => {
            setCreating(true);
            setForm({});
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

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
            items={projects}
            statusField="project_status"
            statusOptions={PROJECT_STATUS_OPTIONS}
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
        Showing {sortedProjects.length} of {projects.length} projects
        {statusFilter !== 'all' && ` with status "${statusFilter}"`}
      </div>

      {/* Pagination Controls at top */}
      <PaginationControls
        currentPage={currentPage}
        perPage={perPage}
        total={filteredProjects.length}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName="projects"
        className="border-b pb-4 mb-6"
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading projects...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {creating && (
            <div className="w-full">
              <EntityCard
                title="New Project"
                editing
                onSave={handleSave}
                onCancel={resetForm}
                editForm={
                  <ProjectForm
                    form={form}
                    setForm={setForm}
                    clients={clients}
                    leads={leads}
                  />
                }
              />
            </div>
          )}

          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedProjects.map((project) => (
                <div key={project.id} className="w-full">
                  <EntityCard
                    title={
                      <Link
                        to={`/projects/${project.id}`}
                        className="hover:underline font-medium text-base block"
                      >
                        {project.project_name}
                      </Link>
                    }
                    editing={editingId === project.id}
                    onEdit={() => handleEdit(project)}
                    onCancel={resetForm}
                    onSave={handleSave}
                    onDelete={() => handleDelete(project.id)}
                    editForm={
                      <FormWrapper>
                        <ProjectForm
                          form={form}
                          setForm={setForm}
                          clients={clients}
                          leads={leads}
                        />
                      </FormWrapper>
                    }
                    details={
                      <ul className="text-sm text-gray-700 space-y-1">
                        {project.type && <li>Type: {project.type}</li>}
                        <li>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            project.project_status === 'won' ? 'bg-green-100 text-green-800' :
                            project.project_status === 'lost' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {project.project_status?.toUpperCase() || 'PENDING'}
                          </span>
                        </li>
                        {project.project_description && <li>{project.project_description}</li>}

                        {project.client_id && project.client_name && (
                          <li>
                            <Link to={`/clients/${project.client_id}`} className="text-blue-600 hover:underline">
                              {USE_ACCOUNT_LABELS ? "Account" : "Client"}: {project.client_name}
                            </Link>
                          </li>
                        )}

                        {project.lead_id && project.lead_name && (
                          <li>
                            <Link to={`/leads/${project.lead_id}`} className="text-blue-600 hover:underline">
                              Lead: {project.lead_name}
                            </Link>
                          </li>
                        )}

                        {!project.client_id && !project.lead_id && project.primary_contact_name && (
                          <li className="text-blue-600">
                            Contact: {project.primary_contact_name}
                          </li>
                        )}

                        {!project.client_id && !project.lead_id && !project.primary_contact_name && (
                          <li className="text-yellow-600 text-xs font-medium">⚠️ Unassigned Project</li>
                        )}

                        {project.project_worth && <li>Worth: ${project.project_worth.toLocaleString()}</li>}
                        {project.project_start && <li>Start: {new Date(project.project_start).toLocaleDateString()}</li>}
                        {project.project_end && <li>End: {new Date(project.project_end).toLocaleDateString()}</li>}
                        {project.notes && (
                          <li className="whitespace-pre-wrap text-gray-600">
                            <strong>Notes:</strong> {project.notes?.trim() || "No notes provided."}
                          </li>
                        )}
                      </ul>
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <ProjectsTable
              projects={sortedProjects}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortField={tableSortField}
              sortDirection={tableSortDirection}
              onSort={handleTableSort}
            />
          )}

          {sortedProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <LayoutGrid size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-500 mb-4">
                {statusFilter !== 'all' 
                  ? `No projects with status "${statusFilter}". Try adjusting your filters.`
                  : "Get started by creating your first project."
                }
              </p>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Show all projects
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
        total={filteredProjects.length}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName="projects"
        className="border-t pt-4 mt-6"
      />
    </div>
  );
}