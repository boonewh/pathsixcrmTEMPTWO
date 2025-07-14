import { useEffect, useState } from "react";
import { UserPlus, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useAuth } from "@/authContext";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useLocalEntityStore } from "@/hooks/useLocalEntityStore";
import { useSyncQueue } from "@/hooks/useSyncQueue";

type Contact = {
  id: number;
  first_name: string;
  last_name: string;
  title?: string;
  email?: string;
  phone?: string;
  phone_label?: string;
  secondary_phone?: string;
  secondary_phone_label?: string;
  notes?: string;
};

type Props = {
  entityType: "client" | "lead";
  entityId: number;
};

export default function CompanyContacts({ entityType, entityId }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Contact>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const { token } = useAuth();
  const { authReady, canMakeAPICall } = useAuthReady();
  const { listEntities, createEntity, updateEntity, deleteEntity } = useLocalEntityStore();
  const { queueOperation } = useSyncQueue();

  const loadContacts = async () => {
    if (!authReady) return;

    const shouldUseOffline = !canMakeAPICall || !navigator.onLine;

    if (!shouldUseOffline) {
      try {
        const res = await apiFetch(`/contacts/?${entityType}_id=${entityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setContacts(data);
          setIsOfflineMode(false);
          return;
        }
      } catch (err) {
        console.warn("API fetch failed, using offline fallback");
      }
    }

    // Fallback to offline
    const result = await listEntities("contacts");
    if (result.success && result.data?.items) {
      const filtered = result.data.items.filter((c: any) => c[`${entityType}_id`] === entityId);
      setContacts(filtered);
      setIsOfflineMode(true);
    } else {
      setContacts([]);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [authReady, entityType, entityId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.getElementById("kabob-menu");
      if (menu && !menu.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => {
    setForm({});
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    const url = editingId ? `/contacts/${editingId}` : "/contacts/";
    const method = editingId ? "PUT" : "POST";
    const payload = { ...form, [`${entityType}_id`]: entityId };

    if (!editingId && canMakeAPICall && navigator.onLine) {
      try {
        const res = await apiFetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await loadContacts();
          resetForm();
          return;
        }
      } catch (err) {
        console.warn("API create failed, using offline fallback");
      }
    }

    // Offline fallback
    const result = editingId
      ? await updateEntity("contacts", editingId, payload)
      : await createEntity("contacts", payload);

    if (result.success) {
      const offlineId = result.data?.id;
      await queueOperation(editingId ? "UPDATE" : "CREATE", "contacts", offlineId, payload, offlineId);
      await loadContacts();
      resetForm();
    } else {
      alert("Failed to save contact.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this contact?")) return;

    if (canMakeAPICall && navigator.onLine) {
      try {
        const res = await apiFetch(`/contacts/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          await loadContacts();
          return;
        }
      } catch (err) {
        console.warn("Delete failed, falling back to offline");
      }
    }

    const result = await deleteEntity("contacts", id);
    if (result.success) {
      await queueOperation("DELETE", "contacts", id, {});
      await loadContacts();
    } else {
      alert("Failed to delete contact.");
    }
  };

  return (
    <details className="bg-white rounded shadow-sm border">
      <summary className="cursor-pointer px-4 py-2 font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-t flex items-center gap-2">
        <UserPlus size={16} /> Additional Contacts ({contacts.length})
      </summary>

      <div className="p-4 space-y-4">
        {showForm && (
          <div className="space-y-2">
            {/* Form fields same as before */}
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="First Name" value={form.first_name || ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              <Input placeholder="Last Name" value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <Input placeholder="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />

            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="col-span-2" />
              <select value={form.phone_label || "work"} onChange={(e) => setForm({ ...form, phone_label: e.target.value })} className="border rounded px-2 py-1">
                <option value="work">Work</option>
                <option value="mobile">Mobile</option>
                <option value="home">Home</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Secondary Phone" value={form.secondary_phone || ""} onChange={(e) => setForm({ ...form, secondary_phone: e.target.value })} className="col-span-2" />
              <select value={form.secondary_phone_label || "mobile"} onChange={(e) => setForm({ ...form, secondary_phone_label: e.target.value })} className="border rounded px-2 py-1">
                <option value="mobile">Mobile</option>
                <option value="work">Work</option>
                <option value="home">Home</option>
              </select>
            </div>

            <Textarea placeholder="Notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            <div className="flex gap-2">
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              <button onClick={resetForm} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
            </div>
          </div>
        )}

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Add Contact
          </button>
        )}

        <ul className="space-y-4">
          {contacts.map((c) => (
            <li key={c.id} className="border border-gray-300 p-4 rounded shadow-sm relative">
              <div className="font-semibold text-blue-800">
                {c.first_name} {c.last_name}{" "}
                {c.title && <span className="text-sm text-gray-500">({c.title})</span>}
              </div>
              {c.email && <div className="text-sm">📧 <a href={`mailto:${c.email}`} className="text-blue-600 underline">{c.email}</a></div>}
              {c.phone && (
                <div className="text-sm">
                  📞 <a href={`tel:${c.phone}`} className="text-blue-600 underline">{formatPhoneNumber(c.phone)}</a>
                  {c.phone_label && <span className="text-muted-foreground text-sm ml-1">({c.phone_label})</span>}
                  {c.secondary_phone && (
                    <div>
                      ☎️ <a href={`tel:${c.secondary_phone}`} className="text-blue-600 underline">{formatPhoneNumber(c.secondary_phone)}</a>
                      {c.secondary_phone_label && <span className="text-muted-foreground text-sm ml-1">({c.secondary_phone_label})</span>}
                    </div>
                  )}
                </div>
              )}
              {c.notes && <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">📝 {c.notes}</div>}

              <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} className="text-gray-500 hover:text-gray-700">
                  <MoreVertical size={16} />
                </button>

                {openMenuId === c.id && (
                  <div id="kabob-menu" className="absolute right-0 mt-2 w-24 bg-white border rounded shadow-md z-50">
                    <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" onClick={() => {
                      setForm(c);
                      setEditingId(c.id);
                      setShowForm(true);
                      setOpenMenuId(null);
                    }}>
                      Edit
                    </button>
                    <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100" onClick={() => {
                      handleDelete(c.id);
                      setOpenMenuId(null);
                    }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
