import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { apiFetch } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";
import { formatPhoneNumber } from "@/lib/phoneUtils";

interface AdminLead {
  id: number;
  name: string;
  contact_person?: string;
  contact_title?: string;
  email?: string;
  phone?: string;
  assigned_to_name?: string;
  created_by_name?: string;
  created_at?: string;
  lead_status?: string;
  type?: string;
}

interface User {
  id: number;
  email: string;
  is_active: boolean;
}

export default function AdminLeadsPage() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<AdminLead[]>([]);
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
  } = usePagination('admin_leads');

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

  // Load leads when user selection or pagination changes
  useEffect(() => {
    const fetchLeads = async () => {
      if (!selectedEmail) {
        setLeads([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const leadRes = await apiFetch(
          `/leads/all?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}&user_email=${encodeURIComponent(selectedEmail)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const leadsData = await leadRes.json();
        setLeads(leadsData.leads);
        setTotal(leadsData.total);
        setError("");
      } catch {
        setError("Failed to load leads");
        setLeads([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
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
      <h1 className="text-2xl font-bold text-blue-800">Admin: Leads Overview</h1>
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
            entityName="leads"
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
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Assigned To</th>
                    <th className="px-4 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-2">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {lead.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <div>
                          {lead.contact_person ?? "—"}
                          {lead.contact_title && (
                            <div className="text-xs text-gray-500">{lead.contact_title}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">{lead.email ?? "—"}</td>
                      <td className="px-4 py-2">{lead.phone ? formatPhoneNumber(lead.phone) : "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          lead.lead_status === 'open' ? 'bg-green-100 text-green-800' :
                          lead.lead_status === 'converted' ? 'bg-blue-100 text-blue-800' :
                          lead.lead_status === 'lost' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.lead_status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2">{lead.type ?? "—"}</td>
                      <td className="px-4 py-2">{lead.assigned_to_name ?? "—"}</td>
                      <td className="px-4 py-2">
                        {lead.created_at 
                          ? new Date(lead.created_at).toLocaleDateString()
                          : "—"
                        }
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                        No leads found for this user.
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
              entityName="leads"
              className="border-t pt-4"
            />
          )}
        </>
      )}
    </div>
  );
}