import { Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Project } from "@/types";

interface ProjectsTableProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (id: number) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export default function ProjectsTable({ 
  projects, 
  onEdit, 
  onDelete,
  sortField,
  sortDirection,
  onSort 
}: ProjectsTableProps) {
  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleDelete = (project: Project) => {
    if (confirm(`Are you sure you want to delete "${project.project_name}"?`)) {
      onDelete(project.id);
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('project_name')}
            >
              Project Name <span className="ml-1">{getSortIcon('project_name')}</span>
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('project_status')}
            >
              Status <span className="ml-1">{getSortIcon('project_status')}</span>
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('type')}
            >
              Type <span className="ml-1">{getSortIcon('type')}</span>
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('project_worth')}
            >
              Value <span className="ml-1">{getSortIcon('project_worth')}</span>
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => onSort('entity')}
            >
              Entity <span className="ml-1">{getSortIcon('entity')}</span>
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
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {project.project_name}
                  </Link>
                </div>
                {project.project_description && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {project.project_description}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  project.project_status === 'won' ? 'bg-green-100 text-green-800' :
                  project.project_status === 'lost' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {project.project_status?.toUpperCase() || 'PENDING'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {project.type || '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                {project.project_worth ? `$${project.project_worth.toLocaleString()}` : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <div>
                  {/* Entity Link */}
                  {project.client_name && project.client_id && (
                    <Link 
                      to={`/clients/${project.client_id}`} 
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span className="text-xs">🏢</span>
                      {project.client_name}
                    </Link>
                  )}
                  
                  {project.lead_name && project.lead_id && (
                    <Link 
                      to={`/leads/${project.lead_id}`} 
                      className="text-green-600 hover:underline flex items-center gap-1"
                    >
                      <span className="text-xs">🎯</span>
                      {project.lead_name}
                    </Link>
                  )}

                  {/* Standalone project with contact */}
                  {!project.client_name && !project.lead_name && project.primary_contact_name && (
                    <div>
                      <div className="font-medium">{project.primary_contact_name}</div>
                      {project.primary_contact_email && (
                        <div className="text-xs text-gray-500">{project.primary_contact_email}</div>
                      )}
                    </div>
                  )}

                  {/* Truly unassigned */}
                  {!project.client_name && !project.lead_name && !project.primary_contact_name && (
                    <span className="text-yellow-600 text-xs flex items-center gap-1">
                      ⚠️ Unassigned
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {project.created_at ? new Date(project.created_at).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(project)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                    title="Edit project"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {projects.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No projects found.</p>
        </div>
      )}
    </div>
  );
}