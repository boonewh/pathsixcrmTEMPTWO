import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { Lead } from "@/types";
import { apiFetch } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";

interface User {
  id: number;
  email: string;
  is_active: boolean;
}

export default function AdminLeadsPage() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedEmail = searchParams.get("user") || "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadRes, userRes] = await Promise.all([
          apiFetch("/leads/all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch("/users/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const leadData = await leadRes.json();
        const userData = await userRes.json();

        setLeads(leadData);
        setUsers(userData.filter((u: User) => u.is_active));
      } catch {
        setError("Failed to load leads or users");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const filteredLeads = leads.filter((lead) => {
    if (lead.assigned_to_name) {
      return lead.assigned_to_name === selectedEmail;
    }
    return lead.created_by_name === selectedEmail;
  });

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold text-blue-800">Admin: Leads Overview</h1>
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
          <div className="overflow-auto border rounded shadow-sm">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Contact</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-2">
                      <Link to={`/leads/${lead.id}`} className="text-blue-600 hover:underline">
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{lead.contact_person ?? "—"}</td>
                    <td className="px-4 py-2">{lead.email ?? "—"}</td>
                    <td className="px-4 py-2">{lead.assigned_to_name ?? "—"}</td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                      No leads found for this user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
