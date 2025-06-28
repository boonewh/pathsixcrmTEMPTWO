import { useEffect, useState } from "react";
import EntityCard from "@/components/ui/EntityCard";
import { useAuth, userHasRole } from "@/authContext";
import { Mail, Phone, MapPin, User, StickyNote, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import CompanyForm from "@/components/ui/CompanyForm";
import { Client } from "@/types";
import { apiFetch } from "@/lib/api";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePagination } from "@/hooks/usePreferences";

// TEMP: All Seasons Foam prefers "Accounts" instead of "Clients"
const USE_ACCOUNT_LABELS = true;

export default function Customers() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Use pagination hook
  const {
    perPage,
    sortOrder,
    currentPage,
    setCurrentPage,
    updatePerPage,
    updateSortOrder,
  } = usePagination('clients');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    phone_label: "work", 
    secondary_phone: "",
    secondary_phone_label: "mobile",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
    type: "None", 
  });

  const [error, setError] = useState("");
  const { token, user } = useAuth();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; email: string }[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/clients/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setClients(data.clients);
        setTotal(data.total);
        setError(""); // Reset error on successful fetch
      } catch (err) {
        setError("Failed to load clients");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();

    if (userHasRole(user, "admin")) {
      fetch("/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setAvailableUsers(data.filter((u: any) => u.is_active)));
    }
  }, [token, currentPage, perPage, sortOrder]);

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      ...client,
      phone_label: client.phone_label || "work",
      secondary_phone_label: client.secondary_phone_label || "mobile",
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this client?")) return;

    const res = await apiFetch(`/clients/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert("Failed to delete client");
    }
  };

  const handleSave = async () => {
    try {
      const method = creating ? "POST" : "PUT";
      const url = creating ? "/clients/" : `/clients/${editingId}`;

      const res = await apiFetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save client");

      const updatedRes = await apiFetch(`/clients/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fullData = await updatedRes.json();
      setClients(fullData.clients);
      setTotal(fullData.total);
      handleCancel();
    } catch (err: any) {
      setError(err.message || "Failed to save client");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setCreating(false);
    setForm({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      phone_label: "work",
      secondary_phone: "",
      secondary_phone_label: "mobile",
      address: "",
      city: "",
      state: "",
      zip: "",
      notes: "",
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        {USE_ACCOUNT_LABELS ? "Accounts" : "Clients"}
      </h1>

      {error && <p className="text-red-500">{error}</p>}

      <button
        onClick={() => {
          setCreating(true);
          setEditingId(null);
          setForm({
            name: "",
            contact_person: "",
            email: "",
            phone: "",
            phone_label: "work",
            secondary_phone: "",
            secondary_phone_label: "mobile",
            address: "",
            city: "",
            state: "",
            zip: "",
            notes: "",
          });
        }}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {`+ New ${USE_ACCOUNT_LABELS ? "Account" : "Client"}`}
      </button>

      {/* Pagination Controls at top */}
      <PaginationControls
        currentPage={currentPage}
        perPage={perPage}
        total={total}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName={USE_ACCOUNT_LABELS ? "accounts" : "clients"}
        className="border-b pb-4"
      />

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          {creating && (
            <EntityCard
              title={USE_ACCOUNT_LABELS ? "New Account" : "New Client"}
              editing
              onSave={handleSave}
              onCancel={handleCancel}
              editForm={<CompanyForm form={form} setForm={setForm} />}
            />
          )}

          {clients.map((client) => (
            <EntityCard
              key={client.id}
              title={
                <span className="block">
                  <Link
                    to={`/clients/${client.id}`}
                    className="hover:underline font-medium text-base block"
                  >
                    {client.name}
                  </Link>
                  <span className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Wrench size={14} className="text-gray-500" />
                    <span className="text-gray-500 font-medium">Type:</span>{" "}
                    {client.type || "None"}
                  </span>
                </span>
              }
              editing={editingId === client.id}
              onEdit={() => handleEdit(client)}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={() => handleDelete(client.id)}
              editForm={<CompanyForm form={form} setForm={setForm} />}
              details={
                <ul className="text-sm text-gray-600 space-y-1">
                  {client.contact_person && (
                    <li className="flex items-start gap-2">
                      <User size={14} className="mt-[2px]" />
                      <div className="leading-tight">
                        <div>{client.contact_person}</div>
                        {client.contact_title && (
                          <div className="text-gray-500 text-sm italic">{client.contact_title}</div>
                        )}
                      </div>
                    </li>
                  )}
                  {client.email && (
                    <li className="flex items-center gap-2">
                      <Mail size={14} /> {client.email}
                    </li>
                  )}
                  {client.phone && (
                    <li className="flex items-center gap-2">
                      <Phone size={14} />
                      <span>
                        {client.phone}
                        {client.phone_label && (
                          <span className="text-muted-foreground text-sm"> ({client.phone_label})</span>
                        )}
                      </span>
                    </li>
                  )}

                  {client.secondary_phone && (
                    <li className="flex items-center gap-2 ml-[22px]">
                      {/* indentation to align under phone icon */}
                      <span>
                        {client.secondary_phone}
                        {client.secondary_phone_label && (
                          <span className="text-muted-foreground text-sm"> ({client.secondary_phone_label})</span>
                        )}
                      </span>
                    </li>
                  )}
                  {(client.address || client.city || client.state || client.zip) && (
                    <li className="flex items-start gap-2">
                      <MapPin size={14} className="mt-[2px]" />
                      <div className="leading-tight">
                        {client.address && <div>{client.address}</div>}
                        <div>
                          {[client.city, client.state].filter(Boolean).join(", ")}
                          {client.zip ? ` ${client.zip}` : ""}
                        </div>
                      </div>
                    </li>
                  )}
                  {client.notes && (
                    <li className="flex items-start gap-2">
                      <StickyNote size={14} className="mt-[2px]" />{" "}
                      <div>{client.notes}</div>
                    </li>
                  )}
                </ul>
              }
              extraMenuItems={
                userHasRole(user, "admin") ? (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setShowAssignModal(true);
                    }}
                  >
                    Assign
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      )}

      {/* Pagination Controls at bottom */}
      <PaginationControls
        currentPage={currentPage}
        perPage={perPage}
        total={total}
        sortOrder={sortOrder}
        onPageChange={setCurrentPage}
        onPerPageChange={updatePerPage}
        onSortOrderChange={updateSortOrder}
        entityName={USE_ACCOUNT_LABELS ? "accounts" : "clients"}
        className="border-t pt-4"
      />

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Assign {USE_ACCOUNT_LABELS ? "Account" : "Client"}</h2>

            <select
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className="w-full border rounded px-3 py-2 mb-4"
            >
              <option value="">Select a user</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUserId(null);
                  setSelectedClientId(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                disabled={!selectedUserId}
                onClick={async () => {
                  const res = await apiFetch(`/clients/${selectedClientId}/assign`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ assigned_to: selectedUserId }),
                  });

                  if (res.ok) {
                    setShowAssignModal(false);
                    setSelectedUserId(null);
                    setSelectedClientId(null);
                    const updatedRes = await apiFetch(`/clients/?page=${currentPage}&per_page=${perPage}&sort=${sortOrder}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const fullData = await updatedRes.json();
                    setClients(fullData.clients);
                    setTotal(fullData.total);
                  } else {
                    alert("Failed to assign client.");
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}