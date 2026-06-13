import { useState } from "react";
import {
  Shield, Bell, Link2, Palette, AlertTriangle,
  Globe, Users, Lock, EyeOff, Github, Linkedin, Mail,
  Check, ChevronRight, Sun, Moon, Monitor, Trash2,
  LogOut, Download, Key, Loader2, X, AlertCircle,
  UserCheck, MessageSquare, Trophy, Star, CheckCircle,
  Info,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, ThemeMode } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "privacy" | "notifications" | "accounts" | "appearance" | "danger";

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { settings } = useTheme();
  const color = settings.accentColor;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-all duration-200 focus:outline-none focus:ring-2"
      style={{
        width: 44,
        height: 24,
        background: checked ? color : "var(--hack-border)",
        border: `1.5px solid ${checked ? color : "var(--hack-border2)"}`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: checked ? `0 0 10px ${color}40` : "none",
        transition: "background 0.2s, box-shadow 0.2s",
      }}
    >
      <span
        className="absolute top-[2px] rounded-full shadow-md transition-all duration-200"
        style={{
          width: 16,
          height: 16,
          left: checked ? 22 : 3,
          background: "white",
        }}
      />
    </button>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({
  title,
  description,
  children,
  icon: Icon,
  iconColor = "#7C5CFF",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
  iconColor?: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--hack-card)", border: "1px solid var(--hack-border)" }}
    >
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--hack-divider)" }}
      >
        {Icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}15` }}
          >
            <Icon size={15} style={{ color: iconColor }} />
          </div>
        )}
        <div>
          <h3 className="font-700 text-sm" style={{ color: "var(--hack-text)" }}>{title}</h3>
          {description && <p className="text-xs mt-0.5" style={{ color: "var(--hack-text-dim)" }}>{description}</p>}
        </div>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--hack-divider)" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Setting Row ──────────────────────────────────────────────────────────────
function SettingRow({
  label,
  description,
  children,
  dangerous = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  dangerous?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ borderColor: "var(--hack-divider)" }}>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-500 leading-tight"
          style={{ color: dangerous ? "#EF4444" : "var(--hack-text)" }}
        >
          {label}
        </div>
        {description && (
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--hack-text-dim)" }}>{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── Privacy Radio Selector ───────────────────────────────────────────────────
const VISIBILITY_OPTIONS = [
  { value: "public",  label: "Public",        description: "Anyone on the internet can view your profile", icon: Globe,    color: "#22C55E" },
  { value: "members", label: "Members Only",  description: "Only registered HackOS users can view your profile", icon: Users,    color: "#4F7CFF" },
  { value: "team",    label: "Team Members",  description: "Only people in your teams can see your full profile", icon: UserCheck, color: "#F59E0B" },
  { value: "private", label: "Private",       description: "Only you can view your profile. You won't appear in searches.", icon: EyeOff,   color: "#EF4444" },
];

function VisibilitySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {VISIBILITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="flex items-start gap-3 p-4 rounded-xl text-left transition-all"
          style={{
            background: value === opt.value ? `${opt.color}0D` : "var(--hack-section)",
            border: `1.5px solid ${value === opt.value ? `${opt.color}40` : "var(--hack-border)"}`,
          }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${opt.color}15` }}>
            <opt.icon size={15} style={{ color: opt.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-600 text-sm" style={{ color: "var(--hack-text)" }}>{opt.label}</span>
              {value === opt.value && (
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: opt.color }}>
                  <Check size={9} className="text-white" />
                </div>
              )}
            </div>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--hack-text-dim)" }}>{opt.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Theme Option Card ────────────────────────────────────────────────────────
function ThemeCard({
  id, label, icon: Icon, active, onClick, preview,
}: {
  id: string; label: string; icon: React.ElementType;
  active: boolean; onClick: () => void; preview: React.ReactNode;
}) {
  const { settings } = useTheme();
  const accent = settings.accentColor;
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-3 rounded-2xl transition-all text-left"
      style={{
        background: active ? `${accent}0D` : "var(--hack-section)",
        border: `1.5px solid ${active ? `${accent}40` : "var(--hack-border)"}`,
      }}
    >
      <div className="w-full rounded-xl overflow-hidden aspect-video" style={{ background: "var(--hack-bg2)" }}>
        {preview}
      </div>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color: active ? accent : "var(--hack-text-dim)" }} />
          <span className="text-sm font-600" style={{ color: active ? "var(--hack-text)" : "var(--hack-text-dim)" }}>
            {label}
          </span>
        </div>
        {active && (
          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: accent }}>
            <Check size={9} className="text-white" />
          </div>
        )}
      </div>
    </button>
  );
}

const DarkPreview = () => (
  <div className="w-full h-full p-2" style={{ background: "#06070B" }}>
    <div className="flex gap-1 mb-1.5">
      <div className="w-6 h-5 rounded" style={{ background: "#0E111B" }} />
      <div className="flex-1 h-5 rounded" style={{ background: "#0E111B" }} />
    </div>
    <div className="grid grid-cols-3 gap-1">
      {[1,2,3].map(i => <div key={i} className="h-8 rounded" style={{ background: "#131826" }} />)}
    </div>
  </div>
);

const LightPreview = () => (
  <div className="w-full h-full p-2" style={{ background: "#F0F2F8" }}>
    <div className="flex gap-1 mb-1.5">
      <div className="w-6 h-5 rounded" style={{ background: "#E8EBF4" }} />
      <div className="flex-1 h-5 rounded" style={{ background: "#E8EBF4" }} />
    </div>
    <div className="grid grid-cols-3 gap-1">
      {[1,2,3].map(i => <div key={i} className="h-8 rounded" style={{ background: "#FFFFFF" }} />)}
    </div>
  </div>
);

const SystemPreview = () => (
  <div className="w-full h-full flex overflow-hidden" style={{ background: "#0D0D0D" }}>
    <div className="w-1/2 p-1" style={{ background: "#06070B" }}>
      <div className="w-full h-3 rounded mb-1" style={{ background: "#0E111B" }} />
      <div className="grid grid-cols-2 gap-0.5">
        <div className="h-5 rounded" style={{ background: "#131826" }} />
        <div className="h-5 rounded" style={{ background: "#131826" }} />
      </div>
    </div>
    <div className="w-1/2 p-1" style={{ background: "#F0F2F8" }}>
      <div className="w-full h-3 rounded mb-1" style={{ background: "#E8EBF4" }} />
      <div className="grid grid-cols-2 gap-0.5">
        <div className="h-5 rounded" style={{ background: "#FFFFFF" }} />
        <div className="h-5 rounded" style={{ background: "#FFFFFF" }} />
      </div>
    </div>
  </div>
);

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteAccountModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const CONFIRM = "delete my account";

  const handleConfirm = async () => {
    if (input !== CONFIRM) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--hack-overlay)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md rounded-[28px] overflow-hidden"
        style={{ background: "var(--hack-card)", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
      >
        <div className="px-6 py-5 flex items-center gap-4" style={{ borderBottom: "1px solid var(--hack-divider)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
            <AlertTriangle size={18} style={{ color: "#EF4444" }} />
          </div>
          <div className="flex-1">
            <h3 className="font-700 text-base" style={{ color: "var(--hack-text)" }}>Delete Account</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--hack-text-dim)" }}>This action is permanent and cannot be undone</p>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: "var(--hack-text-dim)" }}><X size={16} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl space-y-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="flex items-center gap-2 text-xs font-600 mb-3" style={{ color: "#EF4444" }}>
              <AlertCircle size={13} /> What will be permanently deleted:
            </div>
            {["Your profile and all personal data","All team memberships and invitations","Hackathon registrations and history","Messages and conversation history","GitHub and LinkedIn connections"].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--hack-text-dim)" }}>
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#EF4444" }} /> {item}
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-500 mb-2" style={{ color: "var(--hack-text-dim)" }}>
              Type{" "}<code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>delete my account</code>{" "}to confirm:
            </label>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="delete my account" className="hack-input text-sm" autoFocus />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid var(--hack-divider)" }}>
          <button onClick={onClose} className="hack-btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={input !== CONFIRM || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-600 text-sm transition-all"
            style={{
              background: input === CONFIRM ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${input === CONFIRM ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.1)"}`,
              color: input === CONFIRM ? "#EF4444" : "rgba(239,68,68,0.3)",
              cursor: input !== CONFIRM || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : <><Trash2 size={14} /> Delete Account</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Accent Color Picker ──────────────────────────────────────────────────────
const ACCENT_COLORS = [
  { color: "#7C5CFF", label: "Violet" },
  { color: "#4F7CFF", label: "Blue"   },
  { color: "#22C55E", label: "Green"  },
  { color: "#F59E0B", label: "Amber"  },
  { color: "#EF4444", label: "Red"    },
  { color: "#EC4899", label: "Pink"   },
];

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: React.ElementType; color: string }[] = [
  { id: "privacy",       label: "Privacy",            icon: Shield,       color: "#7C5CFF" },
  { id: "notifications", label: "Notifications",      icon: Bell,         color: "#4F7CFF" },
  { id: "accounts",      label: "Connected Accounts", icon: Link2,        color: "#22C55E" },
  { id: "appearance",    label: "Appearance",         icon: Palette,      color: "#F59E0B" },
  { id: "danger",        label: "Danger Zone",        icon: AlertTriangle, color: "#EF4444" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { settings, effectiveTheme, setMode, setAccentColor, setCompactMode, setReduceMotion, saveSettings } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("privacy");
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Local draft state (applied live; saved on "Save Changes") ────────────
  const [draftMode, setDraftMode] = useState<ThemeMode>(settings.mode);
  const [draftAccent, setDraftAccent] = useState(settings.accentColor);
  const [draftCompact, setDraftCompact] = useState(settings.compactMode);
  const [draftMotion, setDraftMotion] = useState(settings.reduceMotion);

  // ── Privacy ──────────────────────────────────────────────────────────────
  const [profileVisibility, setProfileVisibility] = useState("members");
  const [showEmail, setShowEmail]       = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  const [showGitHub, setShowGitHub]     = useState(true);
  const [showLinkedIn, setShowLinkedIn] = useState(true);
  const [showSkills, setShowSkills]     = useState(true);
  const [showRating, setShowRating]     = useState(true);
  const [showAvail, setShowAvail]       = useState(true);
  const [indexSearch, setIndexSearch]   = useState(true);

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notif, setNotif] = useState({
    teamInvitations: true, teamRequests: true, hackathonReminders: true,
    hackathonDeadlines: true, newMessages: true, profileViews: false,
    trustScoreChanges: true, aiSuggestions: true, organizerAnnouncements: true,
    weeklyDigest: false, marketingEmails: false, pushNotifications: true,
    emailNotifications: true, soundAlerts: false,
  });
  const toggleNotif = (key: keyof typeof notif) => setNotif(p => ({ ...p, [key]: !p[key] }));

  // ── Connected accounts ─────────────────────────────────────────────────────
  const [githubConnected,  setGithubConnected]  = useState(true);
  const [linkedinConnected, setLinkedinConnected] = useState(true);
  const emailVerified = true;

  // ── Apply appearance changes LIVE ─────────────────────────────────────────
  const applyLiveMode = (mode: ThemeMode) => {
    setDraftMode(mode);
    setMode(mode);          // immediate effect
  };

  const applyLiveAccent = (color: string) => {
    setDraftAccent(color);
    setAccentColor(color);  // immediate effect
  };

  const applyLiveCompact = (v: boolean) => {
    setDraftCompact(v);
    setCompactMode(v);
    toast.success(v ? "Compact mode enabled" : "Compact mode disabled");
  };

  const applyLiveMotion = (v: boolean) => {
    setDraftMotion(v);
    setReduceMotion(v);
    toast.success(v ? "Reduced motion enabled" : "Animations restored");
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    saveSettings({ mode: draftMode, accentColor: draftAccent, compactMode: draftCompact, reduceMotion: draftMotion });
    setSaving(false);
    toast.success("Settings saved!");
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    toast.error("Account deleted.");
    setTimeout(() => logout(), 1500);
  };

  const handleExportData = () => toast.success("Data export prepared — check your email.");

  return (
    <div className="p-6 lg:p-8 pb-20 max-w-5xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-700 text-2xl mb-1" style={{ color: "var(--hack-text)" }}>Settings</h1>
        <p className="text-sm" style={{ color: "var(--hack-text-dim)" }}>Manage your account preferences, privacy, and connected services</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Tab Sidebar ── */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="rounded-2xl overflow-hidden" style={{ background: "var(--hack-card)", border: "1px solid var(--hack-border)" }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-500 transition-all text-left relative"
                  style={{
                    background: isActive ? `${tab.color}10` : "transparent",
                    color: isActive ? "var(--hack-text)" : "var(--hack-text-dim)",
                    borderLeft: isActive ? `2px solid ${tab.color}` : "2px solid transparent",
                    borderBottom: "1px solid var(--hack-divider)",
                  }}
                >
                  <tab.icon size={15} style={{ color: isActive ? tab.color : "var(--hack-text-dim)" }} />
                  {tab.label}
                  {isActive && <ChevronRight size={12} className="ml-auto" style={{ color: tab.color }} />}
                </button>
              );
            })}
          </nav>

          {activeTab !== "danger" && (
            <button onClick={handleSave} disabled={saving} className="hack-btn-primary w-full justify-center mt-4 py-3">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Changes</>}
            </button>
          )}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ════════ PRIVACY ════════ */}
          {activeTab === "privacy" && (
            <>
              <Section title="Profile Visibility" description="Control who can see your profile on HackOS" icon={Globe} iconColor="#7C5CFF">
                <div className="p-6">
                  <VisibilitySelector value={profileVisibility} onChange={v => { setProfileVisibility(v); if (v === "private") setIndexSearch(false); }} />
                  {profileVisibility === "private" && (
                    <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                      <Info size={13} style={{ color: "#EF4444" }} className="flex-shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed" style={{ color: "var(--hack-text-dim)" }}>
                        Private profiles won't appear in team searches or AI recommendations. Other builders won't be able to invite you.
                      </p>
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Profile Information Visibility" description="Choose which details appear on your public profile" icon={UserCheck} iconColor="#4F7CFF">
                <SettingRow label="Email Address"   description="Show your email to other members"><Toggle checked={showEmail}   onChange={setShowEmail}   /></SettingRow>
                <SettingRow label="Location"         description="Display your city and country"><Toggle checked={showLocation} onChange={setShowLocation}/></SettingRow>
                <SettingRow label="GitHub Profile"   description="Show your GitHub link and analytics"><Toggle checked={showGitHub}   onChange={setShowGitHub}  /></SettingRow>
                <SettingRow label="LinkedIn Profile" description="Display your LinkedIn connection"><Toggle checked={showLinkedIn} onChange={setShowLinkedIn}/></SettingRow>
                <SettingRow label="Skills & Tech Stack" description="Make your skills visible to team leaders"><Toggle checked={showSkills}   onChange={setShowSkills}  /></SettingRow>
                <SettingRow label="Rating & Reviews" description="Show your peer rating on your profile"><Toggle checked={showRating}   onChange={setShowRating}  /></SettingRow>
                <SettingRow label="Availability Status" description="Let others know if you're open to teams"><Toggle checked={showAvail}    onChange={setShowAvail}   /></SettingRow>
              </Section>

              <Section title="Discoverability" description="Control how others find you on the platform" icon={Lock} iconColor="#22C55E">
                <SettingRow label="Appear in Search Results" description="Let users find your profile through global search and team builder">
                  <Toggle checked={indexSearch} onChange={setIndexSearch} disabled={profileVisibility === "private"} />
                </SettingRow>
                <SettingRow label="AI Team Recommendations" description="Allow HackOS AI to suggest you as a teammate to others">
                  <Toggle checked={true} onChange={() => {}} />
                </SettingRow>
                <SettingRow label="Appear in Live Team Requests" description="Show up in the live team request feed on dashboards">
                  <Toggle checked={true} onChange={() => {}} />
                </SettingRow>
              </Section>
            </>
          )}

          {/* ════════ NOTIFICATIONS ════════ */}
          {activeTab === "notifications" && (
            <>
              <Section title="Delivery Channels" description="Choose how you want to receive notifications" icon={Bell} iconColor="#4F7CFF">
                <SettingRow label="Push Notifications"  description="Browser and desktop push notifications"><Toggle checked={notif.pushNotifications}  onChange={() => toggleNotif("pushNotifications")}  /></SettingRow>
                <SettingRow label="Email Notifications" description={`Receive updates at ${user?.email || "alex@example.com"}`}><Toggle checked={notif.emailNotifications} onChange={() => toggleNotif("emailNotifications")} /></SettingRow>
                <SettingRow label="Sound Alerts"        description="Play a sound when new notifications arrive"><Toggle checked={notif.soundAlerts}          onChange={() => toggleNotif("soundAlerts")}          /></SettingRow>
              </Section>

              <Section title="Team Activity" description="Notifications related to your teams and requests" icon={Users} iconColor="#7C5CFF">
                <SettingRow label="Team Invitations" description="When someone invites you to join their team"><Toggle checked={notif.teamInvitations} onChange={() => toggleNotif("teamInvitations")} /></SettingRow>
                <SettingRow label="Join Requests"    description="When someone requests to join your team"><Toggle checked={notif.teamRequests}    onChange={() => toggleNotif("teamRequests")}    /></SettingRow>
              </Section>

              <Section title="Hackathons" description="Stay updated on competitions and events" icon={Trophy} iconColor="#F59E0B">
                <SettingRow label="Hackathon Reminders"     description="Reminders about hackathons you've registered for"><Toggle checked={notif.hackathonReminders}     onChange={() => toggleNotif("hackathonReminders")}     /></SettingRow>
                <SettingRow label="Deadline Alerts"         description="Alerts when registration or submission deadlines approach"><Toggle checked={notif.hackathonDeadlines}     onChange={() => toggleNotif("hackathonDeadlines")}     /></SettingRow>
                <SettingRow label="Organizer Announcements" description="Updates from hackathon organizers (venue, schedule changes)"><Toggle checked={notif.organizerAnnouncements} onChange={() => toggleNotif("organizerAnnouncements")} /></SettingRow>
              </Section>

              <Section title="Messages & AI" description="Notification preferences for chats and AI features" icon={MessageSquare} iconColor="#22C55E">
                <SettingRow label="New Messages"      description="Notifications for direct and team messages"><Toggle checked={notif.newMessages}      onChange={() => toggleNotif("newMessages")}      /></SettingRow>
                <SettingRow label="AI Suggestions"    description="When AI recommends teammates, hackathons, or opportunities"><Toggle checked={notif.aiSuggestions}    onChange={() => toggleNotif("aiSuggestions")}    /></SettingRow>
                <SettingRow label="Profile Views"     description="When someone views your profile (weekly digest)"><Toggle checked={notif.profileViews}     onChange={() => toggleNotif("profileViews")}     /></SettingRow>
                <SettingRow label="Trust Score Updates" description="When your trust score increases or decreases"><Toggle checked={notif.trustScoreChanges} onChange={() => toggleNotif("trustScoreChanges")} /></SettingRow>
              </Section>

              <Section title="Email Digests" description="Periodic summary emails (unsubscribe anytime)" icon={Mail} iconColor="#EF4444">
                <SettingRow label="Weekly Activity Digest"       description="A summary of your HackOS activity every Monday"><Toggle checked={notif.weeklyDigest}    onChange={() => toggleNotif("weeklyDigest")}    /></SettingRow>
                <SettingRow label="Marketing & Product Updates"  description="New features, blog posts, and announcements from HackOS"><Toggle checked={notif.marketingEmails} onChange={() => toggleNotif("marketingEmails")} /></SettingRow>
              </Section>
            </>
          )}

          {/* ════════ CONNECTED ACCOUNTS ════════ */}
          {activeTab === "accounts" && (
            <>
              <Section title="Connected Services" description="Link external accounts to improve your trust score and profile" icon={Link2} iconColor="#22C55E">
                {/* GitHub */}
                <div className="px-6 py-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--hack-hover)" }}>
                    <Github size={20} style={{ color: "var(--hack-text)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-600 text-sm" style={{ color: "var(--hack-text)" }}>GitHub</span>
                      {githubConnected && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-600" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--hack-text-dim)" }}>
                      {githubConnected ? "Syncing repositories, languages and contribution data" : "Connect to showcase your development journey (+25% Trust)"}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (githubConnected) { setGithubConnected(false); toast.info("GitHub disconnected."); } else { toast.success("Redirecting to GitHub OAuth..."); setTimeout(() => setGithubConnected(true), 1500); } }}
                    className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-600 transition-all"
                    style={{ background: githubConnected ? "rgba(239,68,68,0.1)" : "var(--hack-hover)", border: `1px solid ${githubConnected ? "rgba(239,68,68,0.2)" : "var(--hack-border)"}`, color: githubConnected ? "#EF4444" : "var(--hack-text-dim)" }}
                  >
                    {githubConnected ? "Disconnect" : "Connect"}
                  </button>
                </div>

                {/* LinkedIn */}
                <div className="px-6 py-5 flex items-center gap-4" style={{ borderTop: "1px solid var(--hack-divider)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(79,124,255,0.12)" }}>
                    <Linkedin size={20} style={{ color: "#4F7CFF" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-600 text-sm" style={{ color: "var(--hack-text)" }}>LinkedIn</span>
                      {linkedinConnected && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-600" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--hack-text-dim)" }}>
                      {linkedinConnected ? "Profile imported: Alex Singh · Full Stack Developer" : "Import your professional experience and skills (+25% Trust)"}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (linkedinConnected) { setLinkedinConnected(false); toast.info("LinkedIn disconnected."); } else { toast.success("Opening LinkedIn import..."); setTimeout(() => setLinkedinConnected(true), 1500); } }}
                    className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-600 transition-all"
                    style={{ background: linkedinConnected ? "rgba(239,68,68,0.1)" : "var(--hack-hover)", border: `1px solid ${linkedinConnected ? "rgba(239,68,68,0.2)" : "var(--hack-border)"}`, color: linkedinConnected ? "#EF4444" : "var(--hack-text-dim)" }}
                  >
                    {linkedinConnected ? "Disconnect" : "Connect"}
                  </button>
                </div>

                {/* Email */}
                <div className="px-6 py-5 flex items-center gap-4" style={{ borderTop: "1px solid var(--hack-divider)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${settings.accentColor}12` }}>
                    <Mail size={20} style={{ color: settings.accentColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-600 text-sm" style={{ color: "var(--hack-text)" }}>Email</span>
                      {emailVerified && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-600" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                          <CheckCircle size={9} /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--hack-text-dim)" }}>{user?.email || "alex@example.com"} · Primary account email</p>
                  </div>
                  <button onClick={() => toast.info("To change your email, contact support@hackos.ai")} className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-600 transition-all" style={{ background: "var(--hack-hover)", border: "1px solid var(--hack-border)", color: "var(--hack-text-dim)" }}>
                    Change
                  </button>
                </div>
              </Section>

              {/* Trust Score impact */}
              <Section title="Trust Score Impact" description="How your connected accounts affect your visibility" icon={Star} iconColor="#F59E0B">
                <div className="p-6 grid grid-cols-2 gap-3">
                  {[
                    { label: "Email Verified",    value: "+25%", done: emailVerified,     color: settings.accentColor },
                    { label: "GitHub Connected",  value: "+25%", done: githubConnected,   color: "#22C55E"            },
                    { label: "LinkedIn Imported", value: "+25%", done: linkedinConnected, color: "#4F7CFF"            },
                    { label: "Resume Uploaded",   value: "+25%", done: false,             color: "#F59E0B"            },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: item.done ? `${item.color}0A` : "var(--hack-section)", border: `1px solid ${item.done ? `${item.color}20` : "var(--hack-border)"}` }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: item.done ? `${item.color}20` : "var(--hack-hover)" }}>
                        {item.done ? <Check size={11} style={{ color: item.color }} /> : <div className="w-2 h-2 rounded-full" style={{ background: "var(--hack-text-dim)" }} />}
                      </div>
                      <div>
                        <div className="text-xs font-500" style={{ color: "var(--hack-text-sub)" }}>{item.label}</div>
                        <div className="text-xs font-700" style={{ color: item.done ? item.color : "var(--hack-text-dim)" }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Security */}
              <Section title="Security" description="Password and authentication settings" icon={Key} iconColor="#EF4444">
                <SettingRow label="Change Password" description="Last changed 3 months ago">
                  <button onClick={() => toast.info("Password reset email sent!")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-600 transition-all" style={{ background: "var(--hack-hover)", border: "1px solid var(--hack-border)", color: "var(--hack-text-sub)" }}>
                    <Key size={12} /> Reset
                  </button>
                </SettingRow>
                <SettingRow label="Two-Factor Authentication" description="Add an extra layer of security to your account">
                  <button onClick={() => toast.info("2FA setup coming soon!")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-600 transition-all" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22C55E" }}>
                    <Shield size={12} /> Enable
                  </button>
                </SettingRow>
              </Section>
            </>
          )}

          {/* ════════ APPEARANCE ════════ */}
          {activeTab === "appearance" && (
            <>
              {/* Theme selector */}
              <Section title="Theme" description="Choose how HackOS looks for you" icon={Palette} iconColor="#F59E0B">
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-3">
                    <ThemeCard id="dark"   label="Dark"   icon={Moon}    active={draftMode === "dark"}   onClick={() => applyLiveMode("dark")}   preview={<DarkPreview />}   />
                    <ThemeCard id="light"  label="Light"  icon={Sun}     active={draftMode === "light"}  onClick={() => applyLiveMode("light")}  preview={<LightPreview />}  />
                    <ThemeCard id="system" label="System" icon={Monitor} active={draftMode === "system"} onClick={() => applyLiveMode("system")} preview={<SystemPreview />} />
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--hack-text-dim)" }}>
                    <Info size={12} />
                    {draftMode === "system" ? "Following your OS preference — currently " + effectiveTheme + " mode" : `${draftMode.charAt(0).toUpperCase() + draftMode.slice(1)} mode active — changes apply instantly`}
                  </div>
                </div>
              </Section>

              {/* Accent color */}
              <Section title="Accent Color" description="Customize the primary color used throughout the interface" icon={Palette} iconColor={settings.accentColor}>
                <div className="p-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    {ACCENT_COLORS.map(opt => (
                      <button
                        key={opt.color}
                        onClick={() => applyLiveAccent(opt.color)}
                        title={opt.label}
                        className="flex flex-col items-center gap-1.5 transition-all"
                      >
                        <div
                          className="w-10 h-10 rounded-xl transition-all flex items-center justify-center"
                          style={{
                            background: opt.color,
                            boxShadow: draftAccent === opt.color ? `0 0 0 2px var(--hack-card), 0 0 0 4px ${opt.color}` : "none",
                            transform: draftAccent === opt.color ? "scale(1.15)" : "scale(1)",
                          }}
                        >
                          {draftAccent === opt.color && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-[10px]" style={{ color: "var(--hack-text-dim)" }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--hack-section)", border: "1px solid var(--hack-border)" }}>
                    <div className="w-6 h-6 rounded-lg flex-shrink-0" style={{ background: draftAccent }} />
                    <span className="text-xs font-500" style={{ color: "var(--hack-text-sub)" }}>Current accent: <strong style={{ color: draftAccent }}>{ACCENT_COLORS.find(c => c.color === draftAccent)?.label || draftAccent}</strong></span>
                    <span className="text-xs ml-auto" style={{ color: "var(--hack-text-dim)" }}>Changes apply instantly</span>
                  </div>
                </div>
              </Section>

              {/* Display preferences */}
              <Section title="Display Preferences" description="Fine-tune the interface density and animations" icon={Monitor} iconColor="#4F7CFF">
                <SettingRow label="Compact Mode" description="Reduce spacing and padding for a denser layout">
                  <Toggle checked={draftCompact} onChange={applyLiveCompact} />
                </SettingRow>
                <SettingRow label="Reduce Motion" description="Minimize animations and transitions throughout the app">
                  <Toggle checked={draftMotion} onChange={applyLiveMotion} />
                </SettingRow>
              </Section>
            </>
          )}

          {/* ════════ DANGER ZONE ════════ */}
          {activeTab === "danger" && (
            <>
              <div className="flex items-start gap-4 p-5 rounded-2xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <AlertTriangle size={18} style={{ color: "#EF4444" }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-700 text-sm mb-1" style={{ color: "#EF4444" }}>Danger Zone</h4>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--hack-text-dim)" }}>Actions in this section are permanent and cannot be undone. Please proceed with extreme caution.</p>
                </div>
              </div>

              {/* Export data */}
              <Section title="Export Your Data" description="Download a copy of all your HackOS data" icon={Download} iconColor="#4F7CFF">
                <div className="px-6 py-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--hack-text-sub)" }}>Export a complete archive of your profile, messages, registrations, and activity in JSON format.</p>
                    <p className="text-xs mt-1" style={{ color: "var(--hack-text-dim)" }}>Processing usually takes 1–2 minutes. You'll receive an email with a download link.</p>
                  </div>
                  <button onClick={handleExportData} className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 transition-all" style={{ background: "rgba(79,124,255,0.1)", border: "1px solid rgba(79,124,255,0.2)", color: "#4F7CFF" }}>
                    <Download size={14} /> Export Data
                  </button>
                </div>
              </Section>

              {/* Sign out all devices */}
              <Section title="Session Management" description="Manage where you're logged in" icon={LogOut} iconColor="#F59E0B">
                <div className="px-6 py-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm" style={{ color: "var(--hack-text-sub)" }}>Sign out from all other devices</p>
                    <p className="text-xs mt-1" style={{ color: "var(--hack-text-dim)" }}>This will invalidate all active sessions except your current one.</p>
                  </div>
                  <button onClick={() => toast.success("Signed out of all other devices!")} className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 transition-all" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
                    <LogOut size={14} /> Sign Out All
                  </button>
                </div>
              </Section>

              {/* Delete account */}
              <Section title="Delete Account" description="Permanently remove your account and all associated data" icon={Trash2} iconColor="#EF4444">
                <div className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--hack-text-sub)" }}>
                        Once you delete your account, there is no going back. All your data, teams, messages, and registrations will be permanently removed from HackOS.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {["Profile deleted","Teams removed","Messages erased","Registrations cancelled"].map(item => (
                          <span key={item} className="flex items-center gap-1 text-[10px] font-500 px-2.5 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.7)" }}>
                            <X size={9} />{item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setShowDeleteModal(true)} className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 transition-all mt-1" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
                      <Trash2 size={14} /> Delete Account
                    </button>
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>

      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} />}
    </div>
  );
}
