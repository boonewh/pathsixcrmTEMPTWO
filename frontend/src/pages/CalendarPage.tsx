// CalendarPage.tsx
import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuth } from "@/authContext";
import InteractionModal from "@/components/ui/InteractionModal";
import { Interaction } from "@/types";
import { apiFetch } from "@/lib/api";
import { useLocalEntityStore } from "@/hooks/useLocalEntityStore";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import toast from "react-hot-toast";

const USE_ACCOUNT_LABELS = true;

interface CalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  extendedProps: {
    outcome: string;
    notes: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    phone_label?: "work" | "mobile";
    secondary_phone?: string;
    secondary_phone_label?: "work" | "mobile";
    profile_link?: string;
    entity_type?: string;
    followup_status?: string;
  };
}

export default function CalendarPage() {
  const { token } = useAuth();
  const { canMakeAPICall } = useAuthReady();
  const { updateEntity } = useLocalEntityStore();
  const { queueOperation } = useSyncQueue();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<"all" | "client" | "lead" | "project">("all");
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef<FullCalendar>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/interactions/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const interactions: Interaction[] = data.interactions || data;

      const filtered = interactions.filter((i) => {
        if (!i.follow_up) return false;
        if (filterType === "client") return !!i.client_id;
        if (filterType === "lead") return !!i.lead_id;
        if (filterType === "project") return !!i.project_id;
        return true;
      });

      const eventList: CalendarEvent[] = filtered.map((i) => {
        let entityName = "Unknown Entity";
        let entityType = "unknown";
        if (i.client_name) {
          entityName = i.client_name;
          entityType = "client";
        } else if (i.lead_name) {
          entityName = i.lead_name;
          entityType = "lead";
        } else if (i.project_name) {
          entityName = i.project_name;
          entityType = "project";
        }

        return {
          id: i.id.toString(),
          title: entityName,
          start: i.follow_up!,
          extendedProps: {
            outcome: i.outcome,
            notes: i.notes || "No notes",
            contact_person: i.contact_person,
            email: i.email,
            phone: i.phone,
            phone_label: i.phone_label,
            secondary_phone: i.secondary_phone,
            secondary_phone_label: i.secondary_phone_label,
            profile_link: i.profile_link,
            followup_status: i.followup_status,
            entity_type: entityType,
          },
        };
      });

      setEvents(eventList);
    } catch (err) {
      toast.error("Failed to load follow-up events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [token, filterType]);

  function handleEventClick(arg: any) {
    const { event } = arg;
    const customEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.start!,
      extendedProps: { ...event.extendedProps },
    };
    setSelectedEvent(customEvent);
  }

  async function handleEventDrop(arg: any) {
    const id = arg.event.id;
    const newDate = arg.event.start;

    if (!newDate) return;

    const follow_up = newDate.toISOString();

    if (!canMakeAPICall || !navigator.onLine) {
      // 🔌 Offline fallback
      try {
        const result = await updateEntity("interactions", parseInt(id), { follow_up });
        if (result.success) {
          await queueOperation("UPDATE", "interactions", parseInt(id), { follow_up });
          toast.success("Follow-up rescheduled and queued for sync");
          fetchEvents();
        } else {
          toast.error("Failed to reschedule offline");
          arg.revert();
        }
      } catch (err) {
        console.error(err);
        toast.error("Offline error");
        arg.revert();
      }
      return;
    }

    // 🌐 Online mode
    try {
      const res = await apiFetch(`/interactions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ follow_up }),
      });

      if (!res.ok) {
        toast.error("Failed to update follow-up");
        arg.revert();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating follow-up");
      arg.revert();
    }
  }

  function renderEventContent(arg: any) {
    const isOverdue = new Date(arg.event.start) < new Date();
    const isCompleted = arg.event.extendedProps.followup_status === "completed";
    const entityType = arg.event.extendedProps.entity_type;

    let style = "text-blue-600 font-semibold";
    if (entityType === "lead") style = "text-green-600 font-semibold";
    if (entityType === "project") style = "text-orange-600 font-semibold";
    if (isCompleted) style = "text-gray-500 font-semibold line-through";
    else if (isOverdue) style = "text-red-600 font-semibold";

    return (
      <div className={`${style} truncate max-w-full overflow-hidden whitespace-nowrap`}>
        {entityType === "client" && "🏢 "}
        {entityType === "lead" && "🎯 "}
        {entityType === "project" && "🚧 "}
        {arg.event.title}
      </div>
    );
  }

  function handleDateClick(arg: any) {
    const calendarApi = calendarRef.current?.getApi() as Calendar;
    if (calendarApi) {
      calendarApi.changeView("timeGridDay", arg.dateStr);
    }
  }

  const isMobile = window.innerWidth < 768;

  return (
    <div className="p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Follow-Up Calendar</h1>

      <div className="mb-4">
        <label className="mr-2 font-semibold">Filter by:</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="border rounded px-2 py-1"
        >
          <option value="all">All Entities</option>
          <option value="client">{USE_ACCOUNT_LABELS ? "Accounts Only" : "Clients Only"}</option>
          <option value="lead">Leads Only</option>
          <option value="project">Projects Only</option>
        </select>
      </div>

      <div className="mb-4 flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-blue-600">🏢</span>
          <span>{USE_ACCOUNT_LABELS ? "Accounts" : "Clients"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-600">🎯</span>
          <span>Leads</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-orange-600">🚧</span>
          <span>Projects</span>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading follow-ups...</p>
      ) : (
        <div className="overflow-x-auto">
          <FullCalendar
            ref={calendarRef}
            dateClick={handleDateClick}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            buttonText={{
              today: "Today",
              month: "Month",
              week: "Week",
              day: "Day",
              list: "List",
            }}
            events={events}
            editable={true}
            eventDrop={handleEventDrop}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            height="auto"
          />
        </div>
      )}

      {selectedEvent && (
        <InteractionModal
          title={`${selectedEvent.extendedProps.entity_type === "client" ? (USE_ACCOUNT_LABELS ? "Account" : "Client") : 
                  selectedEvent.extendedProps.entity_type === "lead" ? "Lead" : 
                  selectedEvent.extendedProps.entity_type === "project" ? "Project" : "Entity"} Follow-up: ${selectedEvent.title}`}
          date={new Date(selectedEvent.start).toLocaleString()}
          outcome={selectedEvent.extendedProps.outcome}
          notes={selectedEvent.extendedProps.notes}
          contact_person={selectedEvent.extendedProps.contact_person}
          email={selectedEvent.extendedProps.email}
          phone={selectedEvent.extendedProps.phone}
          phone_label={selectedEvent.extendedProps.phone_label}
          secondary_phone={selectedEvent.extendedProps.secondary_phone}
          secondary_phone_label={selectedEvent.extendedProps.secondary_phone_label}
          profile_link={selectedEvent.extendedProps.profile_link}
          onClose={() => setSelectedEvent(null)}
          calendarLink={""} // optionally add Google Calendar link here
          icsLink={`${import.meta.env.VITE_API_BASE_URL}/interactions/${selectedEvent.id}/calendar.ics`}
        />
      )}
    </div>
  );
}
