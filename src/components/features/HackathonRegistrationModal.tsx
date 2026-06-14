import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X, Upload, CheckCircle, ArrowRight, ArrowLeft, Users,
  Plus, Loader2, Sparkles, Trophy, Calendar, Clock
} from "lucide-react";
import { Hackathon } from "@/types";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// ─── Dynamic schema builder ───────────────────────────────────────────────────
function buildSchema(fields: FormFieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((field) => {
    let schemaField: z.ZodTypeAny;

    switch (field.type) {
      case "email":
        schemaField = z.string().email("Enter a valid email address");
        break;
      case "number":
        schemaField = z.string().regex(/^\d+$/, "Must be a valid number");
        break;
      case "tel":
        schemaField = z.string().min(10, "Enter a valid phone number").max(15, "Too long");
        break;
      case "file":
        schemaField = z.any();
        break;
      default:
        schemaField = z.string();
    }

    if (field.required) {
      if (field.type !== "file") {
        schemaField = (schemaField as z.ZodString).min(1, `${field.label} is required`);
      }
    } else {
      schemaField = schemaField.optional().nullable();
    }

    shape[field.id] = schemaField;
  });
  return z.object(shape);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormFieldConfig {
  id: string;
  label: string;
  type: "text" | "email" | "tel" | "select" | "textarea" | "file" | "number";
  placeholder?: string;
  required: boolean;
  options?: string[];
  accept?: string;
}

const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
  { id: "fullName", label: "Full Name", type: "text", placeholder: "Alex Singh", required: true },
  { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com", required: true },
  { id: "phone", label: "Phone Number", type: "tel", placeholder: "+91 98765 43210", required: true },
  { id: "college", label: "College / University", type: "text", placeholder: "IIT Bombay", required: true },
  { id: "department", label: "Department / Branch", type: "text", placeholder: "Computer Science and Engineering", required: true },
  { id: "year", label: "Year of Study", type: "select", required: true, options: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduated", "Professional"] },
  { id: "studentId", label: "Student ID", type: "text", placeholder: "21CS001", required: false },
  { id: "resume", label: "Resume (PDF)", type: "file", required: false, accept: ".pdf,.doc,.docx" },
  { id: "portfolio", label: "Portfolio / GitHub URL", type: "text", placeholder: "https://github.com/username", required: false },
  { id: "experience", label: "Hackathon Experience", type: "select", required: true, options: ["First hackathon", "1-2 hackathons", "3-5 hackathons", "6+ hackathons"] },
  { id: "whyJoin", label: "Why do you want to join?", type: "textarea", placeholder: "Tell us why you're excited about this hackathon...", required: false },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
    </div>
  );
}

function RegistrationForm({
  hack,
  fields,
  onSuccess,
  onClose,
}: {
  hack: Hackathon;
  fields: FormFieldConfig[];
  onSuccess: (data: any) => void;
  onClose: () => void;
}) {
  const schema = buildSchema(fields);
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const [fileNames, setFileNames] = useState<Record<string, string>>({});

  const { user } = useAuth();

  const onSubmit = async (data: FormValues) => {
    try {
      // Map form outputs dynamically
      let name = user?.name || "Anonymous";
      let email = user?.email || "";
      let college = "";
      let resume_url = "";
      let experience = "";
      const answers: Record<string, any> = {};

      Object.entries(data).forEach(([key, val]) => {
        const field = fields.find(f => f.id === key);
        if (!field) return;

        const labelLower = field.label.toLowerCase();

        if (key === "fullName" || labelLower.includes("full name") || labelLower === "name") {
          name = String(val);
        } else if (field.type === "email" || key === "email" || labelLower.includes("email")) {
          email = String(val);
        } else if (key === "college" || labelLower.includes("college") || labelLower.includes("university")) {
          college = String(val);
        } else if (field.type === "file" || key === "resume" || labelLower.includes("resume") || labelLower.includes("portfolio")) {
          if (val && (val as any).name) {
            resume_url = (val as any).name;
          } else if (val) {
            resume_url = String(val);
          }
        } else if (key === "experience" || labelLower.includes("experience")) {
          experience = String(val);
        } else {
          answers[key] = val;
        }
      });

      const regRecord = {
        hackathon_id: hack.id,
        user_id: user?.id || null,
        name,
        email,
        college,
        resume_url,
        experience,
        answers,
        status: "registered"
      };

      const { error } = await supabase
        .from("registrations")
        .insert(regRecord);

      if (error) throw error;

      onSuccess(data);
    } catch (err: any) {
      console.error("Error registering for hackathon:", err);
      toast.error(err.message || "Failed to register. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div
            key={field.id}
            className={field.type === "textarea" || field.type === "file" ? "sm:col-span-2" : ""}
          >
            <label className="block text-white/60 text-sm font-500 mb-1.5">
              {field.label}
              {field.required && <span className="text-hack-red ml-1">*</span>}
            </label>

            {field.type === "select" ? (
              <select
                {...register(field.id)}
                className="hack-input text-sm"
              >
                <option value="" style={{ background: "#131826" }}>Select an option</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt} style={{ background: "#131826" }}>{opt}</option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                {...register(field.id)}
                placeholder={field.placeholder}
                className="hack-input text-sm resize-none"
                rows={3}
              />
            ) : field.type === "file" ? (
              <div>
                <label
                  className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all"
                  style={{ background: "#0E111B", border: "1px dashed rgba(255,255,255,0.12)" }}
                >
                  <Upload size={15} className="text-hack-primary flex-shrink-0" />
                  <span className="text-sm" style={{ color: fileNames[field.id] ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}>
                    {fileNames[field.id] || `Upload ${field.label}`}
                  </span>
                  <input
                    type="file"
                    accept={field.accept}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setFileNames((prev) => ({ ...prev, [field.id]: f.name }));
                        setValue(field.id, f);
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              <input
                type={field.type}
                {...register(field.id)}
                placeholder={field.placeholder}
                className="hack-input text-sm"
              />
            )}

            {errors[field.id] && (
              <p className="text-hack-red text-xs mt-1">
                {String((errors[field.id] as any)?.message || "Required")}
              </p>
            )}
          </div>
        ))}
      </div>

      <div
        className="pt-4 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button type="button" onClick={onClose} className="hack-btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="hack-btn-primary px-6"
        >
          {isSubmitting ? (
            <><Loader2 size={15} className="animate-spin" /> Submitting...</>
          ) : (
            <><span>Submit Registration</span><ArrowRight size={15} /></>
          )}
        </button>
      </div>
    </form>
  );
}

function SuccessScreen({
  hack,
  onClose,
  registrantName,
}: {
  hack: Hackathon;
  onClose: () => void;
  registrantName: string;
}) {
  const [view, setView] = useState<"success" | "createTeam" | "joinTeam">("success");

  if (view === "createTeam") {
    return (
      <div className="text-center space-y-5">
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.15)" }}
        >
          <Users size={28} className="text-hack-green" />
        </div>
        <div>
          <h3 className="text-white font-700 text-lg mb-2">Create Your Team</h3>
          <p className="text-white/50 text-sm">
            Start a team for {hack.title} and recruit amazing builders who complement your skills.
          </p>
        </div>
        <div
          className="p-4 rounded-2xl text-left space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <label className="text-white/60 text-xs font-500 block mb-1">Team Name</label>
            <input type="text" placeholder={`${registrantName.split(" ")[0]}'s Squad`} className="hack-input text-sm" />
          </div>
          <div>
            <label className="text-white/60 text-xs font-500 block mb-1">Roles Needed</label>
            <div className="flex flex-wrap gap-2">
              {["ML Engineer", "Frontend Dev", "Backend Dev", "UI/UX Designer"].map((role) => (
                <button
                  key={role}
                  type="button"
                  className="tag text-xs cursor-pointer hover:border-hack-primary/40 hover:text-white/80 transition-all"
                >
                  + {role}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("success")} className="hack-btn-secondary flex-1 justify-center">
            <ArrowLeft size={14} /> Back
          </button>
          <Link to="/my-teams" className="flex-1">
            <button onClick={onClose} className="hack-btn-primary w-full justify-center">
              <Sparkles size={14} /> Create Team
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (view === "joinTeam") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-white font-700 text-lg mb-1">Join a Team</h3>
          <p className="text-white/50 text-sm">Teams looking for members for {hack.title}</p>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {[
            { name: "Code Titans", need: "Frontend Dev", members: 2, max: 4, match: 92 },
            { name: "AI Warriors", need: "ML Engineer", members: 3, max: 5, match: 88 },
            { name: "BuildSpace", need: "Backend Dev", members: 1, max: 3, match: 85 },
          ].map((team) => (
            <div
              key={team.name}
              className="flex items-center justify-between p-4 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div>
                <div className="text-white font-600 text-sm">{team.name}</div>
                <div className="text-hack-primary text-xs">Need: {team.need}</div>
                <div className="text-white/40 text-xs">{team.members}/{team.max} Members</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div
                  className="text-xs font-700 px-2 py-1 rounded-lg"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}
                >
                  {team.match}% Match
                </div>
                <button
                  onClick={() => { toast.success(`Request sent to ${team.name}!`); onClose(); }}
                  className="hack-btn-primary py-1.5 px-3 text-xs"
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={() => setView("success")} className="hack-btn-secondary flex-1 justify-center">
            <ArrowLeft size={14} /> Back
          </button>
          <Link to="/my-requests" className="flex-1">
            <button onClick={onClose} className="hack-btn-secondary w-full justify-center">
              View All Teams
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      {/* Celebration */}
      <div className="relative flex justify-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(124,92,255,0.2), rgba(34,197,94,0.15))",
            boxShadow: "0 0 40px rgba(124,92,255,0.25)",
          }}
        >
          <CheckCircle size={36} className="text-hack-green" />
        </div>
        <div className="absolute -top-2 -right-4 text-2xl animate-bounce">🎉</div>
        <div className="absolute -top-1 -left-4 text-xl" style={{ animationDelay: "0.1s" }}>✨</div>
      </div>

      <div>
        <h3 className="text-white font-700 text-xl mb-1">
          You&apos;re registered, {registrantName.split(" ")[0]}!
        </h3>
        <p className="text-white/50 text-sm">
          Successfully registered for <strong className="text-white/80">{hack.title}</strong>
        </p>
      </div>

      {/* Event info */}
      <div
        className="p-4 rounded-2xl text-left grid grid-cols-2 gap-3"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {[
          { icon: Calendar, label: "Start Date", value: hack.startDate },
          { icon: Clock, label: "Days Left", value: `${hack.daysLeft} days` },
          { icon: Trophy, label: "Prize Pool", value: hack.prize },
          { icon: Users, label: "Participants", value: `${hack.participants}+` },
        ].map((info) => (
          <div key={info.label} className="flex items-center gap-2">
            <info.icon size={13} className="text-hack-primary flex-shrink-0" />
            <div>
              <div className="text-white/30 text-[10px]">{info.label}</div>
              <div className="text-white font-500 text-xs">{info.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Next steps */}
      <div className="space-y-2">
        <p className="text-white/40 text-sm">What would you like to do next?</p>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => setView("createTeam")}
            className="hack-btn-primary w-full justify-center py-3"
          >
            <Plus size={15} />
            Create a Team
          </button>
          <button
            onClick={() => setView("joinTeam")}
            className="hack-btn-secondary w-full justify-center py-2.5"
          >
            <Users size={15} />
            Join an Existing Team
          </button>
          <button
            onClick={onClose}
            className="text-white/35 hover:text-white/60 text-sm transition-colors py-1"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface HackathonRegistrationModalProps {
  hack: Hackathon;
  isOpen: boolean;
  onClose: () => void;
  customFields?: FormFieldConfig[];
}

export default function HackathonRegistrationModal({
  hack,
  isOpen,
  onClose,
  customFields,
}: HackathonRegistrationModalProps) {
  const [registered, setRegistered] = useState(false);
  const [registrantName, setRegistrantName] = useState("");
  const fields = customFields || DEFAULT_FORM_FIELDS;

  if (!isOpen) return null;

  const handleSuccess = (data: any) => {
    setRegistrantName(data.fullName || "Builder");
    setRegistered(true);
    toast.success("Registration successful! Check your email for confirmation.");
  };

  const handleClose = () => {
    setRegistered(false);
    setRegistrantName("");
    onClose();
  };

  return (
    <>
      <Backdrop onClose={handleClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-2xl rounded-[28px] overflow-hidden pointer-events-auto"
          style={{
            background: "#0E111B",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(124,92,255,0.08)",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between px-7 py-5 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                style={{ background: "#131826" }}
              >
                <img src={hack.image} alt={hack.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-700 text-lg truncate">{registered ? "Registration Complete" : "Register for Hackathon"}</h2>
                <p className="text-white/40 text-xs truncate">{hack.title} · {hack.organizer}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
              <span className={`tag text-xs ${hack.mode === "Online" ? "online-tag" : "offline-tag"}`}>
                {hack.mode}
              </span>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Prize / deadline strip */}
          {!registered && (
            <div
              className="flex items-center gap-6 px-7 py-3 flex-shrink-0"
              style={{ background: "rgba(124,92,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center gap-2">
                <Trophy size={13} className="text-hack-primary" />
                <span className="text-hack-primary font-700 text-sm">{hack.prize} Prize Pool</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-hack-orange" />
                <span className="text-hack-orange font-600 text-sm">{hack.daysLeft} days left to register</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={13} className="text-white/40" />
                <span className="text-white/40 text-sm">{hack.participants}+ registered</span>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 px-7 py-6 overflow-y-auto">
            {registered ? (
              <SuccessScreen hack={hack} onClose={handleClose} registrantName={registrantName} />
            ) : (
              <RegistrationForm
                hack={hack}
                fields={fields}
                onSuccess={handleSuccess}
                onClose={handleClose}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export type { FormFieldConfig };
