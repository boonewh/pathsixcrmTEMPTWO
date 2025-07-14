import { useEffect, useState } from "react";
import { useAuth, userHasRole } from "@/authContext";
import { apiFetch } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useLocalEntityStore } from "@/hooks/useLocalEntityStore";
import { useSyncQueue } from "@/hooks/useSyncQueue";

interface AdminClient {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  contact_title?: string;
  assigned_to_name?: string;
  created_by_name?: string;
  created_at?: string;
  type?: string;
}

interface User {
  id: number;
  email: string;
  is_active: boolean;
}

export default function AdminClientsPage() {
  const { token, user } = useAuth();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const selectedEmail = searchParams.get("user") || "";

  const { perPage, sortOrder, currentPage, setCurrentPage, updatePerPage, updateSortOrder } =
    usePagination("admin_clients");

  const { authReady, canMakeAPICall } = useAuthReady();
  const { listEntities } = useLocalEntityStore();
  const { queueOperation } = useSyncQueue();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const shouldUseOffline = !canMakeAPICall || !navigator.onLine;

        if (!shouldUseOffline) {
          const userRes = await apiFetch("/users/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const usersData = await userRes.json();
          setUsers(usersData.filter((u: User) => u.is_active));
        } else {
          const result = await listEntities("users", { page: 1, perPage: 100 });
          if (result.success && result.data) {
            setUsers(result.data.items.filter((u: User) => u.is_active));
            setIsOfflineMode(true);
          } else {
            throw new Error(result.error || "Offline load failed");
          }
        }
      } catch (err) {
        setError("Failed to load users");
        setUsers([]);
      }
    };

    fetchUsers();
  }, [token, canMakeAPICall, listEntities]);


  useEffect(() => {
    const fetchClients = async (forceOffline = false) => {
      if (!selectedEmail) {
        setClients([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const shouldUseOffline = forceOffline || !canMakeAPICall || !navigator.onLine;

        if (!shouldUseOffline && authReady) {
          try {
            const res = await apiFetch(
              `/clients/all?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}&user_email=${encodeURIComponent(
                selectedEmail
              )}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const data = await res.json();
            setClients(data.clients);
            setTotal(data.total);
            setIsOfflineMode(false);
            return;
          } catch (err) {
            console.warn("API fetch failed, falling back to offline:", err);
          }
        }

        // Offline fallback
        const result = await listEntities("clients", { page: currentPage, perPage });

        if (result.success && result.data) {
          const filtered = result.data.items.filter(
            (c: any) =>
              c.created_by_name === selectedEmail || c.assigned_to_name === selectedEmail
          );
          setClients(filtered);
          setTotal(filtered.length);
          setIsOfflineMode(true);
        } else {
          throw new Error(result.error || "Offline load failed");
        }
      } catch (err: any) {
        console.error("Load failed:", err);
        setError("Unable to load clients.");
        setClients([]);
        setTotal(0);
        setIsOfflineMode(true);
      } finally {
        setLoading(false);
      }
    };

    if (authReady) {
      fetchClients();
    }
  }, [token, selectedEmail, currentPage, perPage, sortOrder, authReady, canMakeAPICall]);

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

      {isOfflineMode && (
        <p className="text-sm text-yellow-600">
          ⚠️ Offline mode – showing cached data only.
        </p>
      )}

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
                    <th className="px-4 py-2 text-left">Type</th>
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
                      <td className="px-4 py-2">
                        <div>
                          {client.contact_person ?? "—"}
                          {client.contact_title && (
                            <div className="text-xs text-gray-500">{client.contact_title}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">{client.email ?? "—"}</td>
                      <td className="px-4 py-2">
                        {client.phone ? formatPhoneNumber(client.phone) : "—"}
                      </td>
                      <td className="px-4 py-2">{client.type ?? "—"}</td>
                      <td className="px-4 py-2">{client.assigned_to_name ?? "—"}</td>
                      <td className="px-4 py-2">
                        {client.created_at
                          ? new Date(client.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                        No accounts found for this user.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

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
