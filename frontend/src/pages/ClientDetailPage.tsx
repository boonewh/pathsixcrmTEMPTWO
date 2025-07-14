import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  User,
  FolderKanban,
  Wrench,
} from "lucide-react";
import { useAuth, userHasRole } from "@/authContext";
import { Client, Interaction, Account } from "@/types";
import { apiFetch } from "@/lib/api";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import CompanyNotes from "@/components/ui/CompanyNotes";
import CompanyInteractions from "@/components/ui/CompanyInteractions";
import CompanyContacts from "@/components/ui/CompanyContacts";
import { useLocalEntityStore } from "@/hooks/useLocalEntityStore";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import toast from "react-hot-toast";

export default function ClientDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [_accounts, setAccounts] = useState<Account[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState("");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Offline capabilities
  const { updateEntity, listEntities } = useLocalEntityStore();
  const { authReady, canMakeAPICall } = useAuthReady();
  const { queueOperation } = useSyncQueue();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const [projects, setProjects] = useState<any[]>([]);

  const [isAssigning, setIsAssigning] = useState(false);

  // 🔥 NEW: Smart data loading with offline fallback
  const loadClientData = async (forceOffline = false) => {
    if (!id) {
      setLoadError("Invalid client ID");
      return;
    }

    setLoadError("");

    try {
      // Determine if we should use offline mode
      const shouldUseOffline = forceOffline || !canMakeAPICall || !navigator.onLine;

      if (!shouldUseOffline && authReady) {
        // Try API first
        try {
          console.log("📡 Loading client from API...");
          const res = await apiFetch(`/clients/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            if (res.status === 404) {
              throw new Error("Client not found");
            }
            throw new Error(`API Error: ${res.status}`);
          }

          const data = await res.json();
          setClient(data);
          setNewTitle(data.contact_title || "");
          setAccounts(data.accounts || []);
          setIsOfflineMode(false);
          console.log("✅ Successfully loaded client from API");
          return;
        } catch (apiError) {
          console.warn("🌐 API load failed, falling back to offline:", apiError);
          // Fall through to offline mode
        }
      }

      // Use offline storage
      console.log("💾 Loading client from offline storage...");
      const result = await listEntities("clients", { page: 1, perPage: 1000 });
      
      if (result.success && result.data) {
        const clientData = result.data.items.find((c: any) => c.id == id);
        if (clientData) {
          setClient(clientData);
          setNewTitle(clientData.contact_title || "");
          setAccounts([]); // Accounts not stored offline yet
          setIsOfflineMode(true);
          console.log("💾 Successfully loaded client from offline storage");
        } else {
          throw new Error("Client not found in offline storage");
        }
      } else {
        throw new Error(result.error || "Failed to load from offline storage");
      }

    } catch (err: any) {
      console.error("❌ Failed to load client:", err);
      setLoadError(err.message || "Failed to load client");
      setClient(null);
    }
  };

  // 🔥 NEW: Smart interactions loading with offline fallback
  const loadInteractions = async (forceOffline = false) => {
    if (!id) return;

    try {
      const shouldUseOffline = forceOffline || !canMakeAPICall || !navigator.onLine;

      if (!shouldUseOffline && authReady) {
        try {
          const res = await apiFetch(`/interactions/?client_id=${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const data = await res.json();
            setInteractions(data.interactions || data);
            return;
          }
        } catch (apiError) {
          console.warn("🌐 Interactions API failed, falling back to offline:", apiError);
        }
      }

      // Load from offline storage
      const result = await listEntities("interactions", { page: 1, perPage: 1000 });
      if (result.success && result.data) {
        const clientInteractions = result.data.items.filter((i: any) => i.client_id == id);
        setInteractions(clientInteractions);
      }
    } catch (err) {
      console.warn("Failed to load interactions:", err);
      setInteractions([]);
    }
  };

  const loadProjects = async (forceOffline = false) => {
    if (!id) return;

    const shouldUseOffline = forceOffline || !canMakeAPICall || !navigator.onLine;

    if (!shouldUseOffline && authReady) {
      try {
        const res = await apiFetch(`/projects/by-client/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          return;
        }
      } catch (err) {
        console.warn("🌐 Project API failed, trying offline:", err);
      }
    }

    try {
      const result = await listEntities("projects", { page: 1, perPage: 1000 });
      if (result.success && result.data) {
        const filtered = result.data.items.filter((p: any) => p.client_id == id);
        setProjects(filtered);
        setIsOfflineMode(true);
        console.log("💾 Loaded client projects from offline storage");
      } else {
        throw new Error(result.error || "Failed to load projects offline");
      }
    } catch (err) {
      console.warn("❌ Offline project load failed:", err);
      setProjects([]);
    }
  };


  // Load users for admin assignment functionality
  useEffect(() => {
    if (userHasRole(user, "admin") && canMakeAPICall) {
      apiFetch("/users/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load users");
          return res.json();
        })
        .then((data) => {
          setAvailableUsers(data.filter((u: any) => u.is_active));
        })
        .catch((err) => {
          console.error("Error loading users:", err);
        });
    }
  }, [user, canMakeAPICall, token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Future menu behavior
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔥 NEW: Smart note saving with offline queueing
  const handleSaveNotes = async (newNotes: string) => {
    if (!id || !client) return;

    try {
      if (canMakeAPICall && navigator.onLine) {
        // Try API first
        try {
          const res = await apiFetch(`/clients/${id}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ notes: newNotes }),
          });

          if (res.ok) {
            setClient((prev) => prev && { ...prev, notes: newNotes });
            toast.success("Notes saved successfully");
            return;
          }
        } catch (apiError) {
          console.warn("Notes API save failed, using offline mode:", apiError);
        }
      }

      // Use offline storage
      const result = await updateEntity('clients', id, { notes: newNotes });
      if (result.success) {
        // Queue for sync
        await queueOperation('UPDATE', 'clients', id, { notes: newNotes });
        setClient((prev) => prev && { ...prev, notes: newNotes });
        toast.success(`Notes saved ${isOfflineMode ? 'and queued for sync' : 'successfully'}`);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to save notes";
      toast.error(errorMessage);
      throw err; // Re-throw so CompanyNotes can handle the error
    }
  };

  // 🔥 NEW: Smart contact title updating with offline queueing
  const handleUpdateContactTitle = async (title: string) => {
    if (!id || !client) return;

    try {
      if (canMakeAPICall && navigator.onLine) {
        try {
          const res = await apiFetch(`/clients/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ contact_title: title }),
          });

          if (res.ok) {
            setClient((prev) => prev && { ...prev, contact_title: title });
            setEditingTitle(false);
            toast.success("Contact title updated");
            return;
          }
        } catch (apiError) {
          console.warn("Contact title API update failed, using offline mode:", apiError);
        }
      }

      // Use offline storage
      const result = await updateEntity('clients', id, { contact_title: title });
      if (result.success) {
        await queueOperation('UPDATE', 'clients', id, { contact_title: title });
        setClient((prev) => prev && { ...prev, contact_title: title });
        setEditingTitle(false);
        toast.success(`Contact title updated ${isOfflineMode ? 'and queued for sync' : 'successfully'}`);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update contact title");
    }
  };

  if (loadError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{loadError}</p>
          <button
            onClick={() => loadClientData(false)}
            className="mt-2 text-sm bg-red-200 hover:bg-red-300 px-2 py-1 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading client...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Offline Mode Indicator */}
        {isOfflineMode && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-sm text-yellow-800">
                Working offline - changes will sync when connection is restored
              </span>
              <button
                onClick={() => {
                  loadClientData(false);
                  loadInteractions(false);
                  loadProjects();
                }}
                className="ml-auto text-xs bg-yellow-200 hover:bg-yellow-300 px-2 py-1 rounded"
              >
                Retry Online
              </button>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold">{client.name}</h1>

        <ul className="text-sm text-gray-700 space-y-1">
          {client.type && (
            <li className="flex items-center gap-2">
              <Wrench size={14} className="text-gray-500" />
              <span className="text-gray-500 font-medium">Type:</span> {client.type}
            </li>
          )}
          {client.contact_person && (
            <li className="flex items-start gap-2">
              <User size={14} className="mt-[2px]" />
              <div className="leading-tight">
                <div>{client.contact_person}</div>
                {editingTitle ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      className="border px-2 py-1 rounded text-sm"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <button
                      className="text-blue-600 text-sm"
                      onClick={() => handleUpdateContactTitle(newTitle)}
                    >
                      Save
                    </button>
                    <button
                      className="text-gray-500 text-sm"
                      onClick={() => {
                        setNewTitle(client.contact_title || "");
                        setEditingTitle(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  client.contact_title && (
                    <div
                      className="text-gray-500 text-sm italic hover:underline cursor-pointer"
                      onClick={() => setEditingTitle(true)}
                    >
                      {client.contact_title}
                    </div>
                  )
                )}
              </div>
            </li>
          )}

          {client.email && (
            <li className="flex items-center gap-2">
              <Mail size={14} />
              <a href={`mailto:${client.email}`} className="text-blue-600 underline">
                {client.email}
              </a>
            </li>
          )}

          {client.phone && (
            <li className="flex items-start gap-2">
              <Phone size={14} className="mt-[2px]" />
              <div className="leading-tight">
                <div>
                  <a href={`tel:${client.phone}`} className="text-blue-600 underline">
                    {formatPhoneNumber(client.phone)}
                  </a>
                  {client.phone_label && (
                    <span className="text-muted-foreground text-sm ml-1">
                      ({client.phone_label})
                    </span>
                  )}
                </div>
                {client.secondary_phone && (
                  <div>
                    <a href={`tel:${client.secondary_phone}`} className="text-blue-600 underline">
                      {formatPhoneNumber(client.secondary_phone)}
                    </a>
                    {client.secondary_phone_label && (
                      <span className="text-muted-foreground text-sm ml-1">
                        ({client.secondary_phone_label})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          )}

          <li className="flex items-start gap-2">
            <MapPin size={14} className="mt-[2px]" />
            <div className="leading-tight">
              {client.address && <div>{client.address}</div>}
              <div>{[client.city, client.state].filter(Boolean).join(", ")} {client.zip}</div>
            </div>
          </li>
        </ul>

        <CompanyInteractions
          token={token!}
          entityType="client"
          entityId={client.id}
          initialInteractions={interactions}
        />

        <CompanyNotes
          notes={client.notes || ""}
          onSave={handleSaveNotes}
        />

        <CompanyContacts
          token={token!}
          entityType="client"
          entityId={client.id}
        />

        {/* Projects Section */}
        <details className="bg-white rounded shadow-sm border">
          <summary className="cursor-pointer px-4 py-2 font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-t flex items-center gap-2">
            <FolderKanban size={16} /> Projects ({projects.length})
          </summary>

          <div className="p-4 space-y-4">
            {projects.length === 0 ? (
              <p className="text-sm text-gray-500">
                No projects found for this client.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-800">
                {projects.map((p) => (
                  <li key={p.id} className="border-b pb-2">
                    <div className="font-medium">
                      <Link
                        to={`/projects/${p.id}`}
                        className="text-blue-700 hover:underline"
                      >
                        {p.project_name}
                      </Link>
                    </div>

                    <div className="text-gray-600 italic">{p.project_status}</div>

                    {p.project_description && (
                      <div className="text-gray-700">{p.project_description}</div>
                    )}

                    <div className="text-gray-500 text-xs">
                      Created: {new Date(p.created_at).toLocaleDateString()}
                    </div>

                    {p.project_start && (
                      <div className="text-gray-500 text-xs">
                        Start: {new Date(p.project_start).toLocaleDateString()}
                      </div>
                    )}

                    {p.project_end && (
                      <div className="text-gray-500 text-xs">
                        End: {new Date(p.project_end).toLocaleDateString()}
                      </div>
                    )}

                    {p.project_worth !== undefined && p.project_worth !== null && (
                      <div className="text-gray-500 text-xs">
                        Worth: ${p.project_worth.toLocaleString()}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>

        {/* Assignment Button - Only show if online */}
        {userHasRole(user, "admin") && !isOfflineMode && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Assign Account
          </button>
        )}
      </div>

      {/* Assignment Modal - Only works online */}
      {showAssignModal && !isOfflineMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Assign Account</h2>

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
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                disabled={!selectedUserId || isAssigning}
                onClick={async () => {
                  setIsAssigning(true);
                  const res = await apiFetch(`/clients/${id}/assign`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ assigned_to: selectedUserId }),
                  });

                  if (res.ok) {
                    setShowAssignModal(false);
                    toast.success("Account assigned successfully");
                    // Don't reload entire page, just refresh the data
                    await loadClientData();
                  } else {
                    toast.error("Failed to assign account.");
                  }
                  setIsAssigning(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {isAssigning ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}