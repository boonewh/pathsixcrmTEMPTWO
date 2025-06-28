import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { apiFetch } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";

interface AdminInteraction {
  id: number;
  contact_date: string;
  summary: string;
  outcome?: string;
  follow_up?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  client_name?: string;
  lead_name?: string;
  followup_status?: string;
  profile_link?: string;
  assigned_to_name?: string;
  created_by_name?: string;
}

interface User {
  id: number;
  email: string;
  is_active: boolean;
}

function InteractionTable({ title, interactions, loading }: { title: string; interactions: AdminInteraction[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-blue-700">{title}</h2>
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-blue-700">{title}</h2>
        <div className="text-center py-8 text-gray-500">No {title.toLowerCase()} interactions found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-blue-700">{title}</h2>
      <div className="overflow-auto border rounded shadow-sm">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Assigned To</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Contact</th>
              <th className="px-4 py-2 text-left">Summary</th>
              <th className="px-4 py-2 text-left">Next Step</th>
              <th className="px-4 py-2 text-left">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {interactions.map((i) => (
              <tr key={i.id} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-2">{i.assigned_to_name || "—"}</td>
                <td className="px-4 py-2">{new Date(i.contact_date).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <Link to={i.profile_link || "#"} className="text-blue-600 hover:underline">
                    {i.client_name || i.lead_name || "—"}
                  </Link>
                </td>
                <td className="px-4 py-2">{i.contact_person?.trim() || "—"}</td>
                <td className="px-4 py-2">{i.summary}</td>
                <td className="px-4 py-2">{i.outcome || "—"}</td>
                <td className="px-4 py-2">
                  {i.follow_up ? new Date(i.follow_up).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminInteractionsPage() {
  const { token } = useAuth();
  const [interactions, setInteractions] = useState<AdminInteraction[]>([]);
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
  } = usePagination('admin_interactions');

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

  // Load interactions when user selection or pagination changes
  useEffect(() => {
    const fetchInteractions = async () => {
      if (!selectedEmail) {
        setInteractions([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const interactionRes = await apiFetch(
          `/interactions/all?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}&user_email=${encodeURIComponent(selectedEmail)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const interactionsData = await interactionRes.json();
        setInteractions(interactionsData.interactions);
        setTotal(interactionsData.total);
        setError("");
      } catch {
        setError("Failed to load interactions");
        setInteractions([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchInteractions();
  }, [token, selectedEmail, currentPage, perPage, sortOrder]);

  // Reset to page 1 when user selection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmail, setCurrentPage]);

  const handleUserChange = (email: string) => {
    setSearchParams(email ? { user: email } : {});
    setCurrentPage(1);
  };

  // Categorize interactions
  const today = new Date().toISOString().slice(0, 10);

  const overdue: AdminInteraction[] = [];
  const todayDue: AdminInteraction[] = [];
  const upcoming: AdminInteraction[] = [];
  const completed: AdminInteraction[] = [];

  interactions.forEach((i) => {
    const isCompleted = i.followup_status === "completed";
    const followUp = i.follow_up ? i.follow_up.slice(0, 10) : null;

    if (isCompleted) {
      completed.push(i);
    } else if (followUp && followUp < today) {
      overdue.push(i);
    } else if (followUp === today) {
      todayDue.push(i);
    } else {
      upcoming.push(i);
    }
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-800">Admin: All Interactions</h1>
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
            entityName="interactions"
            className="border-b pb-4"
          />

          {/* Categorized Interactions */}
          <div className="space-y-8">
            <InteractionTable title="Overdue" interactions={overdue} loading={loading} />
            <InteractionTable title="Today" interactions={todayDue} loading={loading} />
            <InteractionTable title="Upcoming" interactions={upcoming} loading={loading} />
            <InteractionTable title="Completed" interactions={completed} loading={loading} />
          </div>

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
              entityName="interactions"
              className="border-t pt-4"
            />
          )}
        </>
      )}
    </div>
  );
}