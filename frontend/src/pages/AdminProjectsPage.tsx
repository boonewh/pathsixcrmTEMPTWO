import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { apiFetch } from "@/lib/api";
import { Link } from "react-router-dom";

interface AdminProject {
  id: number;
  project_name: string;
  project_status: string;
  project_description?: string;
  project_start?: string;
  project_end?: string;
  project_worth?: number;
  client_name?: string;
  lead_name?: string;
  client_id?: number;
  lead_id?: number;
  created_at?: string;
  assigned_to_email?: string;
}

export default function AdminProjectsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await apiFetch("/projects/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        const sorted = data.sort((a: AdminProject, b: AdminProject) => {
          return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
        });

        setProjects(sorted);
      } catch {
        setError("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [token]);

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold text-blue-800">Admin: All Projects</h1>
      {error && <p className="text-red-500">{error}</p>}

      {loading ? (
        <div className="text-gray-500 text-center py-10">Loading...</div>
      ) : (
        <div className="overflow-auto border rounded shadow-sm">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Project</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Attached To</th>
                <th className="px-4 py-2 text-left">Assigned Email</th>
                <th className="px-4 py-2 text-left">Worth</th>
                <th className="px-4 py-2 text-left">Start</th>
                <th className="px-4 py-2 text-left">End</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50 transition">
                    <td>{p.project_name}</td>
                    <td className="px-4 py-2">{p.project_status}</td>
                    <td className="px-4 py-2">
                    {p.client_id && p.client_name ? (
                        <Link to={`/clients/${p.client_id}`} className="text-blue-600 hover:underline">
                        Client: {p.client_name}
                        </Link>
                    ) : p.lead_id && p.lead_name ? (
                        <Link to={`/leads/${p.lead_id}`} className="text-blue-600 hover:underline">
                        Lead: {p.lead_name}
                        </Link>
                    ) : (
                        "—"
                    )}
                    </td>
                    <td className="px-4 py-2">{p.assigned_to_email || "—"}</td>
                    <td className="px-4 py-2">{p.project_worth ? `$${p.project_worth}` : "—"}</td>
                    <td className="px-4 py-2">
                        {p.project_start ? new Date(p.project_start).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                        {p.project_end ? new Date(p.project_end).toLocaleDateString() : "—"}
                    </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
