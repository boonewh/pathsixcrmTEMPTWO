import { useEffect, useState } from "react";
import { useAuth } from "@/authContext";
import { Interaction } from "@/types";
import { addDays, isBefore, isToday, isWithinInterval, parseISO, formatDistanceToNow } from "date-fns";
import InteractionModal from "@/components/ui/InteractionModal";
import { apiFetch } from "@/lib/api";

type SortOption = 'time' | 'name' | 'priority';

export default function Dashboard() {
  const { token } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('time');

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
        setInteractions(data.interactions || data); // Handle both paginated and non-paginated responses
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

  // Sorting function
  const sortInteractions = (interactions: typeof parsedFollowUps) => {
    return [...interactions].sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return a.parsedFollowUp.getTime() - b.parsedFollowUp.getTime();
        case 'name':
          const nameA = a.client_name || a.lead_name || '';
          const nameB = b.client_name || b.lead_name || '';
          return nameA.localeCompare(nameB);
        case 'priority':
          // Priority: overdue > today > future, then by time within each group
          const isOverdueA = isBefore(a.parsedFollowUp, now) && !isToday(a.parsedFollowUp);
          const isOverdueB = isBefore(b.parsedFollowUp, now) && !isToday(b.parsedFollowUp);
          const isTodayA = isToday(a.parsedFollowUp);
          const isTodayB = isToday(b.parsedFollowUp);
          
          if (isOverdueA && !isOverdueB) return -1;
          if (!isOverdueA && isOverdueB) return 1;
          if (isTodayA && !isTodayB && !isOverdueA && !isOverdueB) return -1;
          if (!isTodayA && isTodayB && !isOverdueA && !isOverdueB) return 1;
          
          return a.parsedFollowUp.getTime() - b.parsedFollowUp.getTime();
        default:
          return 0;
      }
    });
  };

  const followUpsToday = sortInteractions(
    parsedFollowUps.filter((i) => isToday(i.parsedFollowUp))
  );

  const overdueFollowUps = sortInteractions(
    parsedFollowUps.filter(
      (i) => isBefore(i.parsedFollowUp, now) && !isToday(i.parsedFollowUp)
    )
  );

  const upcomingFollowUps = sortInteractions(
    parsedFollowUps.filter(
      (i) =>
        isWithinInterval(i.parsedFollowUp, {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          end: addDays(now, 7),
        })
    )
  );

  const InteractionList = ({ interactions, title, bgColor, borderColor }: {
    interactions: typeof parsedFollowUps;
    title: string;
    bgColor: string;
    borderColor: string;
  }) => {
    if (interactions.length === 0) return null;

    return (
      <section className={`${bgColor} border-l-4 ${borderColor} p-4 rounded`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className={`font-semibold ${borderColor.includes('yellow') ? 'text-yellow-800' : borderColor.includes('red') ? 'text-red-800' : 'text-green-800'}`}>
            {title} ({interactions.length})
          </h2>
        </div>
        <ul className="space-y-1 text-sm">
          {interactions.map((i) => (
<li
  key={i.id}
  className="text-gray-700 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer"
  onClick={() => setSelectedInteraction(i)}
>
  <div className="font-medium text-gray-800">
    {i.client_name || i.lead_name} - {i.follow_up ? new Date(i.follow_up).toLocaleDateString() : new Date(i.parsedFollowUp).toLocaleDateString()}
  </div>
  <div className="text-sm">
    <strong>Summary:</strong> {i.summary}
  </div>
  <div className="text-sm">
    <strong>Next Step:</strong> {i.outcome}
  </div>
</li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="time">Time</option>
            <option value="name">Company Name</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>

      <InteractionList
        interactions={overdueFollowUps}
        title="⚠️ Overdue Follow-ups"
        bgColor="bg-red-50"
        borderColor="border-red-500"
      />

      <InteractionList
        interactions={followUpsToday}
        title="📅 Follow-ups for Today"
        bgColor="bg-yellow-50"
        borderColor="border-yellow-500"
      />

      <InteractionList
        interactions={upcomingFollowUps}
        title="🗓️ Upcoming in Next 7 Days"
        bgColor="bg-green-50"
        borderColor="border-green-500"
      />

      {recentActivity.length > 0 && (
        <section className="bg-white border border-gray-300 p-4 rounded shadow-sm">
          <h2 className="text-lg font-semibold mb-2 text-blue-700">🕓 Recently Touched</h2>
          <ul className="space-y-2 text-sm text-gray-800">
            {recentActivity.map((entry) => (
              <li key={`${entry.entity_type}-${entry.entity_id}`}>
                <a
                  href={entry.profile_link}
                  className="text-blue-600 hover:underline"
                >
                  {entry.name}
                </a>{" "}
                <span className="text-gray-500">
                  {formatDistanceToNow(parseISO(entry.last_touched), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedInteraction && (
        <InteractionModal
          title={`Follow-up: ${selectedInteraction.client_name || selectedInteraction.lead_name}`}
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