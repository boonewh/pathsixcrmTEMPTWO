import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { apiFetch } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";

interface AdminClient {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  assigned_to_name?: string;
  created_by_name?: string;
}

interface User {
  id: number;
  email: string;
  is_active: boolean;
}

export default function AdminClientsPage() {
  const { token } = useAuth();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedEmail = searchParams.get("user") || "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientRes, userRes] = await Promise.all([
          apiFetch("/clients/all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch("/users/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const clientsData = await clientRes.json();
        const usersData = await userRes.json();

        setClients(clientsData);
        setUsers(usersData.filter((u: User) => u.is_active));
      } catch {
        setError("Failed to load clients or users");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const filteredClients = clients.filter((client) => {
    if (client.assigned_to_name) {
      return client.assigned_to_name === selectedEmail;
    }
    return client.created_by_name === selectedEmail;
  });

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold text-blue-800">Admin: Accounts Overview</h1>
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
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-2">
                      <Link
                        to={`/clients/${client.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{client.contact_person ?? "—"}</td>
                    <td className="px-4 py-2">{client.email ?? "—"}</td>
                    <td className="px-4 py-2">{client.phone ?? "—"}</td>
                    <td className="px-4 py-2">{client.assigned_to_name ?? "—"}</td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                      No clients found for this user.
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
