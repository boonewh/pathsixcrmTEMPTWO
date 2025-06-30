import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { Interaction } from "@/types";
import { addDays, isBefore, isToday, isWithinInterval, parseISO, formatDistanceToNow } from "date-fns";
import InteractionModal from "@/components/ui/InteractionModal";
import { apiFetch } from "@/lib/api";

// TEMP: All Seasons Foam prefers "Accounts" instead of "Clients"
const USE_ACCOUNT_LABELS = true;

export default function Dashboard() {
  const { token } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);

  interface ActivityEntry {
    entity_type: string;
    entity_id: number;
    name: string;
    last_touched: string;
    profile_link: string;
  }

  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    apiFetch("/interactions/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Dashboard interactions:", data);
        setInteractions(data.interactions || data); // Handle both paginated and direct array responses
      });
  }, [token]);

  useEffect(() => {
    apiFetch("/activity/recent", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setRecentActivity);
  }, [token]);

  const now = new Date();

  const parsedFollowUps = interactions
    .filter((i) => i.follow_up && i.followup_status !== "completed")
    .map((i) => ({
      ...i,
      parsedFollowUp: parseISO(i.follow_up!),
    }));

  const followUpsToday = parsedFollowUps
    .filter((i) => isToday(i.parsedFollowUp))
    .sort((a, b) => a.parsedFollowUp.getTime() - b.parsedFollowUp.getTime());

  const overdueFollowUps = parsedFollowUps
    .filter(
      (i) => isBefore(i.parsedFollowUp, now) && !isToday(i.parsedFollowUp)
    )
    .sort((a, b) => a.parsedFollowUp.getTime() - b.parsedFollowUp.getTime());

  const upcomingFollowUps = parsedFollowUps
    .filter(
      (i) =>
        isWithinInterval(i.parsedFollowUp, {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          end: addDays(now, 7),
        })
    )
    .sort((a, b) => a.parsedFollowUp.getTime() - b.parsedFollowUp.getTime());

  // Helper function to get entity name and type for display
  const getEntityDisplay = (interaction: Interaction) => {
    if (interaction.client_name) {
      return {
        name: interaction.client_name,
        type: USE_ACCOUNT_LABELS ? "Account" : "Client",
        icon: "🏢"
      };
    } else if (interaction.lead_name) {
      return {
        name: interaction.lead_name,
        type: "Lead",
        icon: "🎯"
      };
    } else if (interaction.project_name) {
      return {
        name: interaction.project_name,
        type: "Project",
        icon: "🚧"
      };
    } else {
      return {
        name: "Unknown Entity",
        type: "Unknown",
        icon: "❓"
      };
    }
  };

  const renderFollowUpItem = (i: any) => {
    const entityDisplay = getEntityDisplay(i);
    
    return (
      <li
        key={i.id}
        className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition-colors"
        onClick={() => {
          console.log("Selected interaction:", i);
          setSelectedInteraction(i);
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{entityDisplay.icon}</span>
          <div className="flex-1">
            <span className="font-medium text-gray-800">
              {entityDisplay.name}
            </span>
            <span className="text-xs text-gray-500 ml-1">({entityDisplay.type})</span>
          </div>
        </div>
        <div className="text-sm">
          <strong>{i.summary}</strong> – {new Date(i.follow_up!).toLocaleTimeString()}
        </div>
      </li>
    );
  };

  const renderFollowUpItemWithDate = (i: any) => {
    const entityDisplay = getEntityDisplay(i);
    
    return (
      <li
        key={i.id}
        className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition-colors"
        onClick={() => setSelectedInteraction(i)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{entityDisplay.icon}</span>
          <div className="flex-1">
            <span className="font-medium text-gray-800">
              {entityDisplay.name}
            </span>
            <span className="text-xs text-gray-500 ml-1">({entityDisplay.type})</span>
          </div>
        </div>
        <div className="text-sm">
          <strong>{i.summary}</strong> – {new Date(i.follow_up!).toLocaleDateString()}
        </div>
      </li>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {overdueFollowUps.length > 0 && (
        <section className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <h2 className="font-semibold text-red-800 mb-2">⚠️ Overdue Follow-ups</h2>
          <ul className="space-y-1 text-sm">
            {overdueFollowUps.map(renderFollowUpItemWithDate)}
          </ul>
        </section>
      )}

      {followUpsToday.length > 0 && (
        <section className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <h2 className="font-semibold text-yellow-800 mb-2">📅 Follow-ups for Today</h2>
          <ul className="space-y-1 text-sm">
            {followUpsToday.map(renderFollowUpItem)}
          </ul>
        </section>
      )}

      {upcomingFollowUps.length > 0 && (
        <section className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <h2 className="font-semibold text-green-800 mb-2">🗓️ Upcoming in Next 7 Days</h2>
          <ul className="space-y-1 text-sm">
            {upcomingFollowUps.map(renderFollowUpItemWithDate)}
          </ul>
        </section>
      )}

      {/* Show message when no follow-ups */}
      {overdueFollowUps.length === 0 && followUpsToday.length === 0 && upcomingFollowUps.length === 0 && (
        <section className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <h2 className="font-semibold text-blue-800 mb-2">✅ All Caught Up!</h2>
          <p className="text-sm text-blue-700">
            You have no pending follow-ups. Great job staying on top of your interactions!
          </p>
        </section>
      )}


      {recentActivity.length > 0 && (
        <section className="bg-white border border-gray-300 p-4 rounded shadow-sm">
          <h2 className="text-lg font-semibold mb-2 text-blue-700">🕓 Recently Touched</h2>
          <ul className="space-y-2 text-sm text-gray-800">
            {recentActivity.map((entry) => {
              // Get appropriate icon and label for entity type
              const getEntityIcon = (entityType: string) => {
                switch (entityType) {
                  case 'client': return '🏢';
                  case 'lead': return '🎯';
                  case 'project': return '🚧';
                  case 'account': return '💼';
                  default: return '📄';
                }
              };

              const getEntityLabel = (entityType: string) => {
                switch (entityType) {
                  case 'client': return USE_ACCOUNT_LABELS ? 'Account' : 'Client';
                  case 'lead': return 'Lead';
                  case 'project': return 'Project';
                  case 'account': return 'Account';
                  default: return 'Item';
                }
              };

              return (
                <li key={`${entry.entity_type}-${entry.entity_id}`} className="flex items-center gap-2">
                  <span className="text-xs">{getEntityIcon(entry.entity_type)}</span>
                  <div className="flex-1">
                    <a
                      href={entry.profile_link}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {entry.name}
                    </a>
                    <span className="text-xs text-gray-500 ml-1">({getEntityLabel(entry.entity_type)})</span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {formatDistanceToNow(parseISO(entry.last_touched), { addSuffix: true })}
                  </span>
                </li>
              );
            })}
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
            const res = await apiFetch(`/interactions/${selectedInteraction.id}/complete`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              setInteractions(prev => prev.filter(i => i.id !== selectedInteraction.id));
              setSelectedInteraction(null);
            } else {
              alert("Failed to mark interaction as completed.");
            }
          }}
        />
      )}
    </div>
  );
}