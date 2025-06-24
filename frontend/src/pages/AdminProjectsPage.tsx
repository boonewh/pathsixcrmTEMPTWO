import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { apiFetch } from "@/lib/api";
import { useSearchParams } from "react-router-dom";

interface AdminProject {
  id: number;
  project_name: string;
  type?: string;
  project_status?: string;
  project_description?: string;
  project_start?: string;
  project_end?: string;
  project_worth?: number;
  client_name?: string;
  lead_name?: string;
  assigned_to_email?: string;
  created_at?: string;
}

interface User {
  id: number;
  email: string;
  is_active: boolean;
}

export default function AdminProjectsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedEmail = searchParams.get("user") || "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, userRes] = await Promise.all([
          apiFetch("/projects/all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch("/users/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const projectsData = await projectRes.json();
        const usersData = await userRes.json();

        setProjects(projectsData);
        setUsers(usersData.filter((u: User) => u.is_active));
      } catch {
        setError("Failed to load projects or users");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const filteredProjects = projects.filter((project) => {
    if (project.assigned_to_email) {
      return project.assigned_to_email === selectedEmail;
    }
    return false;
  });

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold text-blue-800">Admin: Projects Overview</h1>
      {error && <p className="text-red-500">{error}</p>}

      <div className="max-w-sm">
        <label htmlFor="user-select" className="block font-medium mb-2">
          Filter by user:
        </label>
        <select
          id="user-select"
          value={selectedEmail}
          onChange={(e) => {
            const email = e.target.value;
            setSearchParams(email ? { user: email } : {});
          }}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">— Select a user —</option>
          {users.map((u) => (
            <option key={u.id} value={u.email}>
              {u.email}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-10">Loading...</div>
      ) : (
        selectedEmail && (
          <div className="space-y-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className="border rounded p-4 shadow-sm">
                <h2 className="text-lg font-semibold mb-1">{project.project_name}</h2>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li><strong>Status:</strong> {project.project_status}</li>
                  {project.type && <li><strong>Type:</strong> {project.type}</li>}
                  {project.project_description && <li><strong>Description:</strong> {project.project_description}</li>}
                  {project.client_name && <li><strong>Client:</strong> {project.client_name}</li>}
                  {project.lead_name && <li><strong>Lead:</strong> {project.lead_name}</li>}
                  {project.project_worth !== undefined && <li><strong>Worth:</strong> ${project.project_worth.toLocaleString()}</li>}
                  {project.project_start && <li><strong>Start:</strong> {new Date(project.project_start).toLocaleDateString()}</li>}
                  {project.project_end && <li><strong>End:</strong> {new Date(project.project_end).toLocaleDateString()}</li>}
                  {project.assigned_to_email && <li><strong>Assigned To:</strong> {project.assigned_to_email}</li>}
                  {project.created_at && <li><strong>Created:</strong> {new Date(project.created_at).toLocaleDateString()}</li>}
                </ul>
              </div>
            ))}

            {filteredProjects.length === 0 && (
              <div className="text-gray-500 text-center py-6">
                No projects found for this user.
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
