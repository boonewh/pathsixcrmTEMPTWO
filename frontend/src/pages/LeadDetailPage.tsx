// FULLY REFACTORED LeadDetailPage.tsx WITH OFFLINE SUPPORT

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  User,
  FolderKanban,
  Wrench,
} from "lucide-react";
import { useAuth, userHasRole } from "@/authContext";
import { Lead, Interaction } from "@/types";
import { apiFetch } from "@/lib/api";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import CompanyNotes from "@/components/ui/CompanyNotes";
import CompanyInteractions from "@/components/ui/CompanyInteractions";
import CompanyContacts from "@/components/ui/CompanyContacts";
import { useLocalEntityStore } from "@/hooks/useLocalEntityStore";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import toast from "react-hot-toast";

const USE_ACCOUNT_LABELS = true;

export default function LeadDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [showNoteMenu, setShowNoteMenu] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const [projects, setProjects] = useState<any[]>([]);
  const [projectLoadError, setProjectLoadError] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const { updateEntity, listEntities } = useLocalEntityStore();
  const { authReady, canMakeAPICall } = useAuthReady();
  const { queueOperation } = useSyncQueue();

  const loadLeadData = async (forceOffline = false) => {
    if (!id) return;
    setLoadError("");
    const shouldUseOffline = forceOffline || !canMakeAPICall || !navigator.onLine;

    if (!shouldUseOffline && authReady) {
      try {
        const res = await apiFetch(`/leads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        setLead(data);
        setNewTitle(data.contact_title || "");
        setNoteDraft(data.notes || "");
        setIsOfflineMode(false);
        return;
      } catch (err) {
        console.warn("Lead API failed, using offline fallback:", err);
      }
    }

    try {
      const result = await listEntities("leads", { page: 1, perPage: 1000 });
      if (result.success && result.data) {
        const local = result.data.items.find((l: any) => l.id == id);
        if (local) {
          setLead(local);
          setNewTitle(local.contact_title || "");
          setNoteDraft(local.notes || "");
          setIsOfflineMode(true);
          return;
        }
      }
      throw new Error("Lead not found in offline storage");
    } catch (err: any) {
      console.error("Failed to load lead offline:", err);
      setLoadError(err.message || "Unable to load lead");
      setLead(null);
    }
  };

  const loadInteractions = async () => {
    if (!id) return;
    const shouldUseOffline = !canMakeAPICall || !navigator.onLine;

    if (!shouldUseOffline && authReady) {
      try {
        const res = await apiFetch(`/interactions/?lead_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setInteractions(data.interactions || data);
          return;
        }
      } catch (err) {
        console.warn("Interactions API failed, using offline:", err);
      }
    }

    try {
      const result = await listEntities("interactions", { page: 1, perPage: 1000 });
      if (result.success && result.data) {
        const leadInteractions = result.data.items.filter((i: any) => i.lead_id == id);
        setInteractions(leadInteractions);
      }
    } catch (err) {
      console.warn("Failed to load interactions offline:", err);
      setInteractions([]);
    }
  };

  const loadProjects = async () => {
    if (!id || !canMakeAPICall) {
      setProjects([]);
      return;
    }
    try {
      const res = await apiFetch(`/projects/by-lead/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setProjects(await res.json());
    } catch (err) {
      console.warn("Failed to load projects:", err);
      setProjectLoadError("Failed to load associated projects.");
    }
  };

  useEffect(() => {
    if (!authReady) {
      console.log("⏳ Waiting for auth to be ready...");
      return;
    }
    loadLeadData();
    loadInteractions();
    loadProjects();
  }, [id, authReady, token]);

  useEffect(() => {
    if (userHasRole(user, "admin") && canMakeAPICall) {
      apiFetch("/users/", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.ok && res.json())
        .then((data) => setAvailableUsers(data?.filter((u: any) => u.is_active)))
        .catch((err) => console.error("Error loading users:", err));
    }
  }, [user, canMakeAPICall, token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNoteMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveNote = async () => {
    if (!id || !lead) return;
    try {
      if (canMakeAPICall && navigator.onLine) {
        const res = await apiFetch(`/leads/${id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notes: noteDraft }),
        });
        if (res.ok) {
          setLead((prev) => prev && { ...prev, notes: noteDraft });
          setIsEditingNote(false);
          toast.success("Notes saved");
          return;
        }
      }
      const result = await updateEntity("leads", id, { notes: noteDraft });
      if (result.success) {
        await queueOperation("UPDATE", "leads", id, { notes: noteDraft });
        setLead((prev) => prev && { ...prev, notes: noteDraft });
        setIsEditingNote(false);
        toast.success("Notes saved and queued");
      } else throw new Error(result.error);
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    }
  };

  const deleteNote = async () => {
    if (!id || !lead) return;
    try {
      if (canMakeAPICall && navigator.onLine) {
        const res = await apiFetch(`/leads/${id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notes: "" }),
        });
        if (res.ok) {
          setLead((prev) => prev && { ...prev, notes: "" });
          setNoteDraft("");
          setIsEditingNote(false);
          toast.success("Note deleted");
          return;
        }
      }

      const result = await updateEntity("leads", id, { notes: "" });
      if (result.success) {
        await queueOperation("UPDATE", "leads", id, { notes: "" });
        setLead((prev) => prev && { ...prev, notes: "" });
        setNoteDraft("");
        setIsEditingNote(false);
        toast.success("Note deleted and queued");
      } else throw new Error(result.error);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note");
    }
  };

  const handleConvertToClient = async () => {
    if (!lead || !id) return;

    const confirmed = confirm(
      `Convert "${lead.name}" to a ${USE_ACCOUNT_LABELS ? "Account" : "Client"}? This will permanently change the lead to an account.`
    );

    if (!confirmed) return;

    try {
      const res = await apiFetch("/clients/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          contact_person: lead.contact_person,
          city: lead.city,
          state: lead.state,
          zip: lead.zip,
          notes: lead.notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to convert");

      const newClient = await res.json();

      await apiFetch("/interactions/transfer", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          from_lead_id: lead.id,
          to_client_id: newClient.id,
        }),
      });

      await apiFetch(`/leads/${lead.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      window.location.href = `/clients/${newClient.id}`;
    } catch (err: any) {
      toast.error(err.message || "Failed to convert lead to client");
    }
  };



  const handleUpdateContactTitle = async (title: string) => {
    if (!id || !lead) return;
    try {
      if (canMakeAPICall && navigator.onLine) {
        const res = await apiFetch(`/leads/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ contact_title: title }),
        });
        if (res.ok) {
          setLead((prev) => prev && { ...prev, contact_title: title });
          setEditingTitle(false);
          toast.success("Contact title updated");
          return;
        }
      }
      const result = await updateEntity("leads", id, { contact_title: title });
      if (result.success) {
        await queueOperation("UPDATE", "leads", id, { contact_title: title });
        setLead((prev) => prev && { ...prev, contact_title: title });
        setEditingTitle(false);
        toast.success("Contact title updated and queued");
      } else throw new Error(result.error);
    } catch (err: any) {
      toast.error(err.message || "Failed to update contact title");
    }
  };

  if (!id) return <p className="p-6 text-red-600">Invalid lead ID.</p>;
  if (!lead) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 space-y-6">
      
      {isOfflineMode && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-sm text-yellow-800">
              Working offline - changes will sync when connection is restored
            </span>
            <button
              onClick={() => {
                loadLeadData(false);
                loadInteractions();
                loadProjects();
              }}
              className="ml-auto text-xs bg-yellow-200 hover:bg-yellow-300 px-2 py-1 rounded"
            >
              Retry Online
            </button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold">{lead.name}</h1>
      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
        <Wrench size={14} className="text-gray-500" />
        <span className="text-gray-500 font-medium">Type:</span>{" "}
        {lead.type || "None"}
      </div>
      <ul className="text-sm text-gray-700 space-y-1">
        {lead.contact_person && (
          <li className="flex items-start gap-2">
            <User size={14} className="mt-[2px]" />
            <div className="leading-tight">
              <div>{lead.contact_person}</div>
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
                      setNewTitle(lead.contact_title || "");
                      setEditingTitle(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                lead.contact_title && (
                  <div
                    className="text-gray-500 text-sm italic hover:underline cursor-pointer"
                    onClick={() => setEditingTitle(true)}
                  >
                    {lead.contact_title}
                  </div>
                )
              )}
            </div>
          </li>
        )}
        {lead.email && (
          <li className="flex items-center gap-2">
            <Mail size={14} />
            <a href={`mailto:${lead.email}`} className="text-blue-600 underline">
              {lead.email}
            </a>
          </li>
        )}

        {lead.phone && (
          <li className="flex items-start gap-2">
            <Phone size={14} className="mt-[2px]" />
            <div className="leading-tight">
              <div>
                <a href={`tel:${lead.phone}`} className="text-blue-600 underline">
                  {formatPhoneNumber(lead.phone)}
                </a>
                {lead.phone_label && (
                  <span className="text-muted-foreground text-sm ml-1">
                    ({lead.phone_label})
                  </span>
                )}
              </div>
              {lead.secondary_phone && (
                <div>
                  
                  <a href={`tel:${lead.secondary_phone}`}
                    className="text-blue-600 underline"
                  >
                    {formatPhoneNumber(lead.secondary_phone)}
                  </a>
                  {lead.secondary_phone_label && (
                    <span className="text-muted-foreground text-sm ml-1">
                      ({lead.secondary_phone_label})
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
            {lead.address && <div>{lead.address}</div>}
            <div>{[lead.city, lead.state].filter(Boolean).join(", ")} {lead.zip}</div>
          </div>
        </li>
      </ul>

      <CompanyInteractions
        token={token!}
        entityType="lead"
        entityId={lead.id}
        initialInteractions={interactions}
      />

      <CompanyNotes
        notes={noteDraft}
        onSave={saveNote}
        isEditing={isEditingNote}
        setIsEditing={setIsEditingNote}
        onDelete={deleteNote}
        menuRef={menuRef}
        showMenu={showNoteMenu}
        setShowMenu={setShowNoteMenu}
        setNoteDraft={setNoteDraft}
      />

      <CompanyContacts
        token={token!}
        entityType="lead"
        entityId={lead.id}
      />


      <details className="bg-white rounded shadow-sm border">
        <summary className="cursor-pointer px-4 py-2 font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-t flex items-center gap-2">
          <FolderKanban size={16} /> Projects ({projects.length})
        </summary>

        <div className="p-4 space-y-4">
          {projectLoadError && (
            <p className="text-sm text-red-600">{projectLoadError}</p>
          )}

          {projects.length === 0 && !projectLoadError ? (
            <p className="text-sm text-gray-500">No projects found for this lead.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-800">
              {projects.map((p) => (
                <li key={p.id} className="border-b pb-2">
                  <div className="font-medium text-blue-700">{p.project_name}</div>
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


      <button
        onClick={handleConvertToClient}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        {`Convert to ${USE_ACCOUNT_LABELS ? "Account" : "Client"}`}
      </button>

      {userHasRole(user, "admin") && (
        <button
          onClick={() => setShowAssignModal(true)}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Assign Lead
        </button>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Assign Lead</h2>

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
                  const res = await apiFetch(`/leads/${id}/assign`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ assigned_to: selectedUserId }),
                  });

                  if (res.ok) {
                    setShowAssignModal(false);
                    window.location.reload();
                  } else {
                    alert("Failed to assign lead.");
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
    </div>
  );
}
