import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { apiFetch } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";

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

function InteractionTable({ title, interactions }: { title: string; interactions: AdminInteraction[] }) {
  if (interactions.length === 0) return null;

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
  const [users, setUsers] = useState<User[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedEmail = searchParams.get("user") || "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resInteractions, resUsers] = await Promise.all([
          apiFetch("/interactions/all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch("/users/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const dataInteractions = await resInteractions.json();
        const dataUsers = await resUsers.json();

        setInteractions(dataInteractions);
        setUsers(dataUsers.filter((u: User) => u.is_active));
      } catch {
        setError("Failed to load interactions or users");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = interactions.filter(
    (i) =>
      i.assigned_to_name === selectedEmail || i.created_by_name === selectedEmail
  );

  const overdue: AdminInteraction[] = [];
  const todayDue: AdminInteraction[] = [];
  const upcoming: AdminInteraction[] = [];
  const completed: AdminInteraction[] = [];

  filtered.forEach((i) => {
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
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold text-blue-800">Admin: All Interactions</h1>
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
          <>
            <InteractionTable title="Overdue" interactions={overdue} />
            <InteractionTable title="Today" interactions={todayDue} />
            <InteractionTable title="Upcoming" interactions={upcoming} />
            <InteractionTable title="Completed" interactions={completed} />
          </>
        )
      )}
    </div>
  );
}

