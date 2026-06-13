import { useState } from "react";
import {
  Building2, Calendar, MapPin, Trophy, Users, Upload,
  ChevronRight, Check, Globe, Plus, Trash2, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Basic Info", icon: Building2 },
  { id: 2, title: "Event Details", icon: Calendar },
  { id: 3, title: "Prizes & Rules", icon: Trophy },
  { id: 4, title: "Requirements", icon: Users },
  { id: 5, title: "Review", icon: Check },
];

interface FormData {
  name: string;
  organizer: string;
  tagline: string;
  description: string;
  mode: string;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  prizePool: string;
  teamSize: string;
  theme: string;
  tags: string[];
  requirements: string[];
}

export default function HostHackathon() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: "", organizer: "", tagline: "", description: "",
    mode: "Online", location: "", startDate: "", endDate: "",
    registrationDeadline: "", prizePool: "", teamSize: "2-4",
    theme: "", tags: [], requirements: ["Name", "Email", "College", "Resume"],
  });
  const [newTag, setNewTag] = useState("");

  const update = (key: keyof FormData, value: string | string[]) => setForm({ ...form, [key]: value });

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      update("tags", [...form.tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeReq = (req: string) => update("requirements", form.requirements.filter((r) => r !== req));

  const addReq = () => {
    const req = prompt("Add requirement field:");
    if (req) update("requirements", [...form.requirements, req]);
  };

  const handlePublish = () => {
    toast.success("Hackathon published! It's now live on Discover. 🎉");
  };

  return (
    <div className="p-6 lg:p-8 pb-20 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-white font-700 text-2xl mb-1">Host a Hackathon</h1>
        <p className="text-white/40 text-sm">Create and publish your hackathon event</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-hide pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => s.id < step && setStep(s.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 transition-all"
              style={{
                background: step === s.id ? "rgba(124,92,255,0.15)" : step > s.id ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${step === s.id ? "rgba(124,92,255,0.3)" : step > s.id ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)"}`,
                color: step === s.id ? "#A78BFF" : step > s.id ? "#22C55E" : "rgba(255,255,255,0.35)",
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{
                  background: step > s.id ? "#22C55E" : step === s.id ? "#7C5CFF" : "rgba(255,255,255,0.1)",
                  color: "white",
                }}
              >
                {step > s.id ? <Check size={10} /> : s.id}
              </div>
              {s.title}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Form Area */}
      <div className="hack-card p-8">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-white font-700 text-lg">Basic Information</h2>
            {[
              { label: "Hackathon Name *", key: "name", placeholder: "e.g., AI Innovation Challenge 2026" },
              { label: "Organizer Name *", key: "organizer", placeholder: "e.g., TechCorp India" },
              { label: "Tagline", key: "tagline", placeholder: "A short catchy tagline for your hackathon" },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-white/60 text-sm font-500 mb-2">{field.label}</label>
                <input
                  type="text"
                  value={form[field.key as keyof FormData] as string}
                  onChange={(e) => update(field.key as keyof FormData, e.target.value)}
                  placeholder={field.placeholder}
                  className="hack-input"
                />
              </div>
            ))}
            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe your hackathon, its goals, and what participants can expect..."
                className="hack-input resize-none text-sm leading-relaxed"
                rows={5}
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Theme / Category</label>
              <input
                type="text"
                value={form.theme}
                onChange={(e) => update("theme", e.target.value)}
                placeholder="e.g., AI, Web3, Sustainability"
                className="hack-input"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Tags</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="skill-tag flex items-center gap-1 cursor-pointer"
                    onClick={() => update("tags", form.tags.filter((t) => t !== tag))}
                  >
                    {tag} <span className="text-white/40">×</span>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag..."
                  className="hack-input flex-1"
                />
                <button onClick={addTag} className="hack-btn-secondary px-4">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Event Details */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-white font-700 text-lg">Event Details</h2>
            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Mode *</label>
              <div className="flex gap-3">
                {["Online", "Offline", "Hybrid"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => update("mode", mode)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-600 transition-all"
                    style={{
                      background: form.mode === mode ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${form.mode === mode ? "rgba(124,92,255,0.3)" : "rgba(255,255,255,0.07)"}`,
                      color: form.mode === mode ? "#A78BFF" : "rgba(255,255,255,0.45)",
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            {form.mode !== "Online" && (
              <div>
                <label className="block text-white/60 text-sm font-500 mb-2">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="City, State, Country"
                  className="hack-input"
                />
              </div>
            )}
            {[
              { label: "Registration Deadline *", key: "registrationDeadline" },
              { label: "Start Date *", key: "startDate" },
              { label: "End Date *", key: "endDate" },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-white/60 text-sm font-500 mb-2">{field.label}</label>
                <input
                  type="date"
                  value={form[field.key as keyof FormData] as string}
                  onChange={(e) => update(field.key as keyof FormData, e.target.value)}
                  className="hack-input"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Team Size</label>
              <select
                value={form.teamSize}
                onChange={(e) => update("teamSize", e.target.value)}
                className="hack-input"
              >
                {["Solo", "2-3", "2-4", "3-5", "4-6", "Up to 8"].map((s) => (
                  <option key={s} value={s} style={{ background: "#131826" }}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Prizes */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-white font-700 text-lg">Prizes & Rules</h2>
            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Total Prize Pool *</label>
              <input
                type="text"
                value={form.prizePool}
                onChange={(e) => update("prizePool", e.target.value)}
                placeholder="e.g., ₹1,00,000"
                className="hack-input"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-white/60 text-sm font-500">Prize Breakdown</label>
              {[{ place: "1st Place", pct: "50%" }, { place: "2nd Place", pct: "30%" }, { place: "3rd Place", pct: "20%" }].map((p) => (
                <div key={p.place} className="flex gap-3">
                  <input type="text" defaultValue={p.place} className="hack-input w-32" readOnly />
                  <input type="text" placeholder="Amount (e.g., ₹50,000)" className="hack-input flex-1" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Rules & Guidelines</label>
              <textarea
                placeholder="Enter the rules and guidelines for participants..."
                className="hack-input resize-none text-sm"
                rows={5}
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Upload Brochure (Optional)</label>
              <div
                className="p-6 rounded-2xl text-center cursor-pointer transition-all hover:border-hack-primary/30"
                style={{ border: "2px dashed rgba(255,255,255,0.1)" }}
              >
                <Upload size={24} className="mx-auto mb-2 text-white/30" />
                <p className="text-white/40 text-sm">Drag & drop PDF or click to upload</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Requirements */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-white font-700 text-lg">Participant Requirements</h2>
            <p className="text-white/50 text-sm">Define the registration form fields for participants</p>
            <div className="space-y-2">
              {form.requirements.map((req) => (
                <div
                  key={req}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-white/70 text-sm">{req}</span>
                  <button
                    onClick={() => removeReq(req)}
                    className="text-white/30 hover:text-hack-red transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addReq} className="hack-btn-secondary w-full justify-center">
              <Plus size={14} />
              Add Custom Field
            </button>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-white font-700 text-lg">Review & Publish</h2>
            <div className="space-y-3">
              {[
                { label: "Hackathon Name", value: form.name || "Not set" },
                { label: "Organizer", value: form.organizer || "Not set" },
                { label: "Mode", value: form.mode },
                { label: "Dates", value: form.startDate ? `${form.startDate} – ${form.endDate}` : "Not set" },
                { label: "Prize Pool", value: form.prizePool || "Not set" },
                { label: "Team Size", value: form.teamSize },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between p-3 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-white/50">{item.label}</span>
                  <span className="text-white font-500">{item.value}</span>
                </div>
              ))}
            </div>
            <button onClick={handlePublish} className="hack-btn-primary w-full justify-center py-3 text-base">
              <Globe size={16} />
              Publish Hackathon
            </button>
            <button
              onClick={() => toast.success("Saved as draft")}
              className="hack-btn-secondary w-full justify-center py-2.5"
            >
              Save as Draft
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="hack-btn-secondary"
            style={{ opacity: step === 1 ? 0.3 : 1 }}
          >
            <ArrowLeft size={14} />
            Previous
          </button>
          {step < 5 && (
            <button onClick={() => setStep(step + 1)} className="hack-btn-primary">
              Next Step
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
