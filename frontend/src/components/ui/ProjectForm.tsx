import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Project } from "@/types";

// TEMP: All Seasons Foam prefers "Accounts" instead of "Clients"
const USE_ACCOUNT_LABELS = true;

interface SelectableEntity {
  id: number;
  name: string;
}

interface ProjectFormProps {
  form: Partial<Project>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Project>>>;
  clients: SelectableEntity[];
  leads: SelectableEntity[];
}

function splitDateTime(datetime?: string): { date: string; time: string } {
  if (!datetime) return { date: "", time: "" };
  const [date, time = ""] = datetime.split("T");
  return { date, time: time.slice(0, 5) }; // truncate to HH:MM
}

function combineDateTime(date: string, time: string): string | undefined {
  if (!date) return undefined;
  return `${date}T${time || "00:00"}`;
}

export default function ProjectForm({
  form,
  setForm,
  clients,
  leads,
}: ProjectFormProps) {
  const { date: startDate, time: startTime } = splitDateTime(form.project_start);
  const { date: endDate, time: endTime } = splitDateTime(form.project_end);

  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="project_name">Project Name</Label>
        <Input
          id="project_name"
          className="w-full"
          value={form.project_name || ""}
          onChange={(e) => setForm({ ...form, project_name: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="project_description">Description</Label>
        <Textarea
          id="project_description"
          className="w-full"
          value={form.project_description || ""}
          onChange={(e) =>
            setForm({ ...form, project_description: e.target.value })
          }
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="project_status">Status</Label>
        <select
          id="project_status"
          value={form.project_status ?? "pending"}
          onChange={(e) => setForm({ ...form, project_status: e.target.value })}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="project_start_date">Start Date</Label>
          <Input
            id="project_start_date"
            type="date"
            className="w-full"
            value={startDate}
            onChange={(e) =>
              setForm({
                ...form,
                project_start: combineDateTime(e.target.value, startTime),
              })
            }
          />
          <Input
            id="project_start_time"
            type="time"
            className="w-full"
            value={startTime}
            onChange={(e) =>
              setForm({
                ...form,
                project_start: combineDateTime(startDate, e.target.value),
              })
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="project_end_date">End Date</Label>
          <Input
            id="project_end_date"
            type="date"
            className="w-full"
            value={endDate}
            onChange={(e) =>
              setForm({
                ...form,
                project_end: combineDateTime(e.target.value, endTime),
              })
            }
          />
          <Input
            id="project_end_time"
            type="time"
            className="w-full"
            value={endTime}
            onChange={(e) =>
              setForm({
                ...form,
                project_end: combineDateTime(endDate, e.target.value),
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="project_worth">Worth ($)</Label>
        <Input
          id="project_worth"
          type="number"
          className="w-full"
          value={form.project_worth || ""}
          onChange={(e) =>
            setForm({
              ...form,
              project_worth: parseFloat(e.target.value) || 0,
            })
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="client_id">
            {USE_ACCOUNT_LABELS ? "Account" : "Client"}
          </Label>
          <select
            id="client_id"
            className="w-full min-w-0 border rounded px-2 py-1 text-sm"
            value={form.client_id || ""}
            onChange={(e) =>
              setForm({
                ...form,
                client_id: parseInt(e.target.value) || undefined,
              })
            }
          >
            <option value="">
              -- Select {USE_ACCOUNT_LABELS ? "Account" : "Client"} --
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="lead_id">Lead</Label>
          <select
            id="lead_id"
            className="w-full min-w-0 border rounded px-2 py-1 text-sm"
            value={form.lead_id || ""}
            onChange={(e) =>
              setForm({
                ...form,
                lead_id: parseInt(e.target.value) || undefined,
              })
            }
          >
            <option value="">-- Select Lead --</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
