import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { apiFetch } from "@/lib/api";
import { Link } from "react-router-dom";
import EntityCard from "@/components/ui/EntityCard";
import ProjectForm from "@/components/ui/ProjectForm";
import { FormWrapper } from "@/components/ui/FormWrapper";

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<AdminProject>>({});
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [leads, setLeads] = useState<{ id: number; name: string }[]>([]);

  const resetForm = () => {
    setForm({});
    setEditingId(null);
    };

    useEffect(() => {
    const fetchAll = async () => {
        try {
        const [projectsRes, clientsRes, leadsRes] = await Promise.all([
            apiFetch("/projects/all", { headers: { Authorization: `Bearer ${token}` } }),
            apiFetch("/clients/all", { headers: { Authorization: `Bearer ${token}` } }),
            apiFetch("/leads/all", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const projectsData = await projectsRes.json();
        const sorted = projectsData.sort((a: AdminProject, b: AdminProject) =>
            new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
        );
        setProjects(sorted);
        setClients(await clientsRes.json());
        setLeads(await leadsRes.json());
        } catch {
        setError("Failed to load projects");
        } finally {
        setLoading(false);
        }
    };

    fetchAll();
    }, [token]);


  const handleSave = async () => {
    const res = await apiFetch(`/projects/${editingId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await apiFetch("/projects/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await updated.json();
      setProjects(data);
      resetForm();
    } else {
      alert("Failed to save project");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this project?")) return;
    const res = await apiFetch(`/projects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert("Failed to delete project");
    }
  };

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold text-blue-800">Admin: All Projects</h1>
      {error && <p className="text-red-500">{error}</p>}

      {loading ? (
        <div className="text-gray-500 text-center py-10">Loading...</div>
      ) : (
        <div className="space-y-4 list-none">
          {projects.map((p) => (
            <EntityCard
              key={p.id}
              title={p.project_name}
              editing={editingId === p.id}
              onEdit={() => {
                setEditingId(p.id);
                setForm(p);
              }}
              onCancel={resetForm}
              onSave={handleSave}
              onDelete={() => handleDelete(p.id)}
              editForm={
                <FormWrapper>
                  <ProjectForm form={form} setForm={setForm} clients={clients} leads={leads} />
                </FormWrapper>
              }
              details={
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>Status: {p.project_status}</li>
                  {p.project_description && <li>{p.project_description}</li>}
                  {p.client_id && p.client_name && (
                    <li>
                      <Link to={`/clients/${p.client_id}`} className="text-blue-600 hover:underline">
                        Client: {p.client_name}
                      </Link>
                    </li>
                  )}
                  {p.lead_id && p.lead_name && (
                    <li>
                      <Link to={`/leads/${p.lead_id}`} className="text-blue-600 hover:underline">
                        Lead: {p.lead_name}
                      </Link>
                    </li>
                  )}
                  {!p.client_id && !p.lead_id && (
                    <li className="text-yellow-600 text-xs font-medium">⚠️ Unassigned Project</li>
                  )}
                  {p.project_worth && <li>Worth: ${p.project_worth.toLocaleString()}</li>}
                  {p.project_start && <li>Start: {new Date(p.project_start).toLocaleDateString()}</li>}
                  {p.project_end && <li>End: {new Date(p.project_end).toLocaleDateString()}</li>}
                  {p.assigned_to_email && <li>Assigned: {p.assigned_to_email}</li>}
                </ul>
              }
            />
          ))}
          {projects.length === 0 && (
            <div className="text-center text-gray-500">No projects found.</div>
          )}
        </div>
      )}
    </div>
  );
}
