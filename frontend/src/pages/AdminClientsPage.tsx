import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { apiFetch } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";

interface AdminClient {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  assigned_to_name?: string;
  created_by_name?: string;
  created_at?: string;
}

interface User {
  id: number;
  email: string;
  is_active: boolean;
}

export default function AdminClientsPage() {
  const { token } = useAuth();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedEmail = searchParams.get("user") || "";

  // Use pagination hook with admin-specific key
  const {
    perPage,
    sortOrder,
    currentPage,
    setCurrentPage,
    updatePerPage,
    updateSortOrder,
  } = usePagination('admin_clients');

  // Load users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userRes = await apiFetch("/users/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const usersData = await userRes.json();
        setUsers(usersData.filter((u: User) => u.is_active));
      } catch {
        setError("Failed to load users");
      }
    };

    fetchUsers();
  }, [token]);

  // Load clients when user selection or pagination changes
  useEffect(() => {
    const fetchClients = async () => {
      if (!selectedEmail) {
        setClients([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const clientRes = await apiFetch(
          `/clients/all?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}&user_email=${encodeURIComponent(selectedEmail)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const clientsData = await clientRes.json();
        setClients(clientsData.clients);
        setTotal(clientsData.total);
        setError("");
      } catch {
        setError("Failed to load clients");
        setClients([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [token, selectedEmail, currentPage, perPage, sortOrder]);

  // Reset to page 1 when user selection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmail, setCurrentPage]);

  const handleUserChange = (email: string) => {
    setSearchParams(email ? { user: email } : {});
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-800">Admin: Accounts Overview</h1>
      {error && <p className="text-red-500">{error}</p>}

      <div className="max-w-sm">
        <label htmlFor="user-select" className="block font-medium mb-2">
          Filter by user:
        </label>
        <select
          id="user-select"
          value={selectedEmail}
          onChange={(e) => handleUserChange(e.target.value)}
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

      {selectedEmail && (
        <>
          {/* Pagination Controls at top */}
          <PaginationControls
            currentPage={currentPage}
            perPage={perPage}
            total={total}
            sortOrder={sortOrder}
            onPageChange={setCurrentPage}
            onPerPageChange={updatePerPage}
            onSortOrderChange={updateSortOrder}
            entityName="accounts"
            className="border-b pb-4"
          />

          {/* Content */}
          {loading ? (
            <div className="text-gray-500 text-center py-10">Loading...</div>
          ) : (
            <div className="overflow-auto border rounded shadow-sm">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Contact</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">Assigned To</th>
                    <th className="px-4 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
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
                      <td className="px-4 py-2">
                        {client.created_at 
                          ? new Date(client.created_at).toLocaleDateString()
                          : "—"
                        }
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                        No accounts found for this user.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls at bottom */}
          {total > 0 && (
            <PaginationControls
              currentPage={currentPage}
              perPage={perPage}
              total={total}
              sortOrder={sortOrder}
              onPageChange={setCurrentPage}
              onPerPageChange={updatePerPage}
              onSortOrderChange={updateSortOrder}
              entityName="accounts"
              className="border-t pt-4"
            />
          )}
        </>
      )}
    </div>
  );
}