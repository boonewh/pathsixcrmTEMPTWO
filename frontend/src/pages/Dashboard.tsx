// Dashboard.tsx (offline durable)
import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { Interaction } from "@/types";
import { addDays, isBefore, isToday, isWithinInterval, parseISO, formatDistanceToNow } from "date-fns";
import InteractionModal from "@/components/ui/InteractionModal";
import { apiFetch } from "@/lib/api";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useLocalEntityStore } from "@/hooks/useLocalEntityStore";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import toast from "react-hot-toast";

const USE_ACCOUNT_LABELS = true;

export default function Dashboard() {
  const { token } = useAuth();
  const { canMakeAPICall } = useAuthReady();
  const { listEntities, updateEntity } = useLocalEntityStore();
  const { queueOperation } = useSyncQueue();

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    const fetchInteractions = async () => {
      try {
        if (canMakeAPICall && navigator.onLine) {
          const res = await apiFetch("/interactions/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          setInteractions(data.interactions || data);
          setIsOfflineMode(false);
        } else {
          const result = await listEntities("interactions", { page: 1, perPage: 1000 });
          if (result.success && result.data) {
            setInteractions(result.data.items || []);
            setIsOfflineMode(true);
          } else {
            toast.error("Failed to load interactions offline");
          }
        }
      } catch (err) {
        console.error("Error loading interactions:", err);
        toast.error("Unable to load interactions");
      }
    };

    fetchInteractions();
  }, [token, canMakeAPICall, listEntities]);

  useEffect(() => {
    apiFetch("/activity/recent", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setRecentActivity)
      .catch(() => {
        if (!navigator.onLine) {
          setRecentActivity([]); // fallback if offline
        }
      });
  }, [token]);

  const now = new Date();

  const parsedFollowUps = interactions
    .filter((i) => i.follow_up && i.followup_status !== "completed")
    .map((i) => ({ ...i, parsedFollowUp: parseISO(i.follow_up!) }));

  const followUpsToday = parsedFollowUps.filter((i) => isToday(i.parsedFollowUp));
  const overdueFollowUps = parsedFollowUps.filter((i) => isBefore(i.parsedFollowUp, now) && !isToday(i.parsedFollowUp));
  const upcomingFollowUps = parsedFollowUps.filter((i) =>
    isWithinInterval(i.parsedFollowUp, {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      end: addDays(now, 7),
    })
  );

  const getEntityDisplay = (interaction: Interaction) => {
    if (interaction.client_name) return { name: interaction.client_name, type: USE_ACCOUNT_LABELS ? "Account" : "Client", icon: "🏢" };
    if (interaction.lead_name) return { name: interaction.lead_name, type: "Lead", icon: "🎯" };
    if (interaction.project_name) return { name: interaction.project_name, type: "Project", icon: "🚧" };
    return { name: "Unknown", type: "Unknown", icon: "❓" };
  };

  const renderFollowUpItem = (i: any, showDate = false) => {
    const { name, type, icon } = getEntityDisplay(i);
    return (
      <li
        key={i.id}
        className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition-colors"
        onClick={() => setSelectedInteraction(i)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{icon}</span>
          <div className="flex-1">
            <span className="font-medium text-gray-800">{name}</span>
            <span className="text-xs text-gray-500 ml-1">({type})</span>
          </div>
        </div>
        <div className="text-sm">
          <strong>{i.summary}</strong> – {new Date(i.follow_up!).toLocaleString(showDate ? undefined : "en-US", { hour: "numeric", minute: "numeric" })}
        </div>
      </li>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {isOfflineMode && (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded border border-yellow-300">
          ⚠️ Offline mode — changes will sync when connection is restored.
        </div>
      )}

      {overdueFollowUps.length > 0 && (
        <section className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <h2 className="font-semibold text-red-800 mb-2">⚠️ Overdue Follow-ups</h2>
          <ul className="space-y-1 text-sm">
            {overdueFollowUps.map((i) => renderFollowUpItem(i, true))}
          </ul>
        </section>
      )}

      {followUpsToday.length > 0 && (
        <section className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <h2 className="font-semibold text-yellow-800 mb-2">📅 Follow-ups for Today</h2>
          <ul className="space-y-1 text-sm">
            {followUpsToday.map((i) => renderFollowUpItem(i))}
          </ul>
        </section>
      )}

      {upcomingFollowUps.length > 0 && (
        <section className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <h2 className="font-semibold text-green-800 mb-2">🗓️ Upcoming in Next 7 Days</h2>
          <ul className="space-y-1 text-sm">
            {upcomingFollowUps.map((i) => renderFollowUpItem(i, true))}
          </ul>
        </section>
      )}

      {overdueFollowUps.length === 0 && followUpsToday.length === 0 && upcomingFollowUps.length === 0 && (
        <section className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <h2 className="font-semibold text-blue-800 mb-2">✅ All Caught Up!</h2>
          <p className="text-sm text-blue-700">You have no pending follow-ups. Great job!</p>
        </section>
      )}

      {recentActivity.length > 0 && (
        <section className="bg-white border border-gray-300 p-4 rounded shadow-sm">
          <h2 className="text-lg font-semibold mb-2 text-blue-700">🕓 Recently Touched</h2>
          <ul className="space-y-2 text-sm text-gray-800">
            {recentActivity.map((entry) => (
              <li key={`${entry.entity_type}-${entry.entity_id}`} className="flex items-center gap-2">
                <span className="text-xs">{entry.entity_type === 'client' ? '🏢' : entry.entity_type === 'lead' ? '🎯' : entry.entity_type === 'project' ? '🚧' : '📄'}</span>
                <div className="flex-1">
                  <a href={entry.profile_link} className="text-blue-600 hover:underline font-medium">
                    {entry.name}
                  </a>
                  <span className="text-xs text-gray-500 ml-1">
                    ({USE_ACCOUNT_LABELS && entry.entity_type === 'client' ? 'Account' : entry.entity_type.charAt(0).toUpperCase() + entry.entity_type.slice(1)})
                  </span>
                </div>
                <span className="text-gray-500 text-xs">
                  {formatDistanceToNow(parseISO(entry.last_touched), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedInteraction && (
        <InteractionModal
          title={`Follow-up: ${getEntityDisplay(selectedInteraction).name}`}
          date={new Date(selectedInteraction.contact_date).toLocaleString()}
          outcome={selectedInteraction.outcome}
          summary={selectedInteraction.summary}
          notes={selectedInteraction.notes}
          contact_person={selectedInteraction.contact_person}
          email={selectedInteraction.email}
          phone={selectedInteraction.phone}
          phone_label={selectedInteraction.phone_label}
          secondary_phone={selectedInteraction.secondary_phone}
          secondary_phone_label={selectedInteraction.secondary_phone_label}
          profile_link={selectedInteraction.profile_link}
          onClose={() => setSelectedInteraction(null)}
          onMarkComplete={async () => {
            if (!selectedInteraction) return;
            const id = selectedInteraction.id;

            if (!canMakeAPICall || !navigator.onLine) {
              try {
                const result = await updateEntity("interactions", id, { followup_status: "completed" });
                if (result.success) {
                  await queueOperation("UPDATE", "interactions", id, { followup_status: "completed" });
                  setInteractions(prev => prev.filter(i => i.id !== id));
                  setSelectedInteraction(null);
                  toast.success("Marked complete (offline)");
                } else {
                  throw new Error("Offline update failed");
                }
              } catch (err) {
                console.error(err);
                toast.error("Failed to update offline");
              }
              return;
            }

            // Online
            const res = await apiFetch(`/interactions/${id}/complete`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
              setInteractions(prev => prev.filter(i => i.id !== id));
              setSelectedInteraction(null);
              toast.success("Follow-up completed");
            } else {
              toast.error("Failed to mark as completed");
            }
          }}
        />
      )}
    </div>
  );
}
