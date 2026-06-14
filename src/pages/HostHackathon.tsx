import { useState, useEffect } from "react";
import {
  Building2, Calendar, MapPin, Trophy, Users, Upload,
  ChevronRight, Check, Globe, Plus, Trash2, ArrowLeft, MessageSquare, GraduationCap, Link2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { deserializeHackathon } from "@/lib/utils";
import { Hackathon } from "@/types";

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
  requirements: any[];
  image: string;
}

export default function HostHackathon() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mode states
  const [viewMode, setViewMode] = useState<'dashboard' | 'create'>('dashboard');
  const [hostedHackathons, setHostedHackathons] = useState<Hackathon[]>([]);
  const [selectedHack, setSelectedHack] = useState<Hackathon | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'registrations' | 'messages'>('registrations');
  const [loadingHosted, setLoadingHosted] = useState(true);

  // Edit State
  const [editingHackId, setEditingHackId] = useState<string | null>(null);

  // Wizard Form states
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: "", organizer: "", tagline: "", description: "",
    mode: "Online", location: "", startDate: "", endDate: "",
    registrationDeadline: "", prizePool: "", teamSize: "2-4",
    theme: "", tags: [], 
    requirements: [
      { id: "fullName", label: "Full Name", type: "text", required: true },
      { id: "email", label: "Email Address", type: "email", required: true },
      { id: "college", label: "College / University", type: "text", required: true },
      { id: "resume", label: "Resume (PDF) / Photo", type: "file", required: true }
    ],
    image: ""
  });
  const [newTag, setNewTag] = useState("");

  // Step 4 Field Builder states
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'email' | 'textarea' | 'file'>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(true);

  const update = (key: keyof FormData, value: string | string[] | any[]) => setForm({ ...form, [key]: value });

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      update("tags", [...form.tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const addCustomRequirement = () => {
    if (!newFieldName.trim()) {
      toast.error("Please enter a field name.");
      return;
    }

    const fieldId = newFieldName.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    if (form.requirements.some(r => r.id === fieldId)) {
      toast.error("A field with this name already exists.");
      return;
    }

    const newField = {
      id: fieldId,
      label: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired
    };

    update("requirements", [...form.requirements, newField]);
    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldRequired(true);
    toast.success("Field added successfully!");
  };

  // Load User's Hosted Hackathons from Supabase
  useEffect(() => {
    if (!user) {
      setLoadingHosted(false);
      return;
    }

    async function loadHosted() {
      try {
        const { data, error } = await supabase
          .from("hackathons")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) {
          const userHackathons = data.filter((row: any) => {
            const parts = (row.description || "").split("\n\n---METADATA---\n");
            if (parts.length > 1) {
              try {
                const meta = JSON.parse(parts[1]);
                return meta.owner_id === user?.id;
              } catch (e) {
                return false;
              }
            }
            return false;
          }).map(deserializeHackathon);

          setHostedHackathons(userHackathons);
          if (userHackathons.length > 0) {
            setSelectedHack(userHackathons[0]);
            setViewMode('dashboard');
          } else {
            setViewMode('create');
          }
        }
      } catch (err) {
        console.error("Error loading hosted hackathons:", err);
      } finally {
        setLoadingHosted(false);
      }
    }
    loadHosted();
  }, [user]);

  // Load registrations and messages for selected hackathon
  useEffect(() => {
    if (!selectedHack) return;

    async function loadDetails() {
      // 1. Fetch Registrations
      try {
        const { data, error } = await supabase
          .from("registrations")
          .select("*")
          .eq("hackathon_id", selectedHack.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setRegistrations(data || []);
      } catch (e) {
        console.error("Error fetching registrations:", e);
      }

      // 2. Fetch Messages
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (data) {
          const parsed = data.map((msg: any) => {
            try {
              const contentObj = JSON.parse(msg.content);
              return {
                id: msg.id,
                senderId: msg.sender_id,
                createdAt: msg.created_at,
                ...contentObj
              };
            } catch (err) {
              return null;
            }
          }).filter((msg: any) => msg && msg.hackathon_id === selectedHack.id);
          setMessages(parsed);
        }
      } catch (e) {
        console.error("Error fetching messages:", e);
      }
    }

    loadDetails();

    // Subscribe to messages in real-time
    const channel = supabase
      .channel(`organizer-chat-${selectedHack.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          try {
            const newMsg = payload.new;
            const contentObj = JSON.parse(newMsg.content);
            if (contentObj.hackathon_id === selectedHack.id) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [
                  ...prev,
                  {
                    id: newMsg.id,
                    senderId: newMsg.sender_id,
                    createdAt: newMsg.created_at,
                    ...contentObj
                  }
                ];
              });
            }
          } catch (e) {
            // Ignore other formats
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedHack?.id]);

  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!form.name || !form.organizer || !form.description) {
      toast.error("Please fill in all required fields (Name, Organizer, Description).");
      return;
    }

    setIsPublishing(true);
    try {
      const numericPrize = parseInt(form.prizePool.replace(/[^0-9]/g, ""), 10) || 0;

      let daysLeft = 7;
      if (form.registrationDeadline) {
        const deadlineDate = new Date(form.registrationDeadline);
        const today = new Date();
        const diffTime = Math.max(0, deadlineDate.getTime() - today.getTime());
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Serialize owner metadata and requirements array
      const metadata = {
        tags: form.tags,
        location: form.location,
        difficulty: "Intermediate",
        teamSize: form.teamSize,
        owner_id: user?.id,
        requirements: form.requirements
      };
      const serializedDescription = `${form.description}\n\n---METADATA---\n${JSON.stringify(metadata)}`;

      const hackathonPayload = {
        title: form.name,
        organizer: form.organizer,
        description: serializedDescription,
        mode: form.mode as 'Online' | 'Offline' | 'Hybrid',
        prize: form.prizePool || "TBD",
        prize_amount: numericPrize,
        days_left: daysLeft,
        max_participants: 500,
        start_date: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
        end_date: form.endDate ? new Date(form.endDate).toISOString() : new Date().toISOString(),
        registration_deadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : new Date().toISOString(),
        status: 'open',
        image_url: form.image || "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=200&fit=crop"
      };

      let newlyCreated: Hackathon | null = null;

      if (editingHackId) {
        // Edit Mode: Update
        const { data, error } = await supabase
          .from("hackathons")
          .update(hackathonPayload)
          .eq("id", editingHackId)
          .select();

        if (error) throw error;
        newlyCreated = data ? deserializeHackathon(data[0]) : null;
        toast.success("Hackathon updated successfully! 🎉");

        if (newlyCreated) {
          setHostedHackathons((prev) => prev.map((h) => h.id === editingHackId ? newlyCreated! : h));
          setSelectedHack(newlyCreated);
        }
      } else {
        // Create Mode: Insert
        const { data, error } = await supabase
          .from("hackathons")
          .insert(hackathonPayload)
          .select();

        if (error) throw error;
        newlyCreated = data ? deserializeHackathon(data[0]) : null;
        toast.success("Hackathon published! It's now live on Discover. 🎉");

        if (newlyCreated) {
          setHostedHackathons((prev) => [newlyCreated!, ...prev]);
          setSelectedHack(newlyCreated);
        }
      }

      setViewMode('dashboard');
      setEditingHackId(null);

      // Reset Form
      setForm({
        name: "", organizer: "", tagline: "", description: "",
        mode: "Online", location: "", startDate: "", endDate: "",
        registrationDeadline: "", prizePool: "", teamSize: "2-4",
        theme: "", tags: [], 
        requirements: [
          { id: "fullName", label: "Full Name", type: "text", required: true },
          { id: "email", label: "Email Address", type: "email", required: true },
          { id: "college", label: "College / University", type: "text", required: true },
          { id: "resume", label: "Resume (PDF) / Photo", type: "file", required: true }
        ],
        image: ""
      });
      setStep(1);
    } catch (error: any) {
      console.error("Error publishing hackathon:", error);
      toast.error(error.message || "Failed to publish hackathon. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedHack) return;
    if (!confirm(`Are you sure you want to delete "${selectedHack.title}"? All participants and details will be disconnected.`)) return;

    try {
      const { error } = await supabase
        .from("hackathons")
        .delete()
        .eq("id", selectedHack.id);

      if (error) throw error;

      toast.success("Hackathon deleted successfully.");
      const updatedList = hostedHackathons.filter((h) => h.id !== selectedHack.id);
      setHostedHackathons(updatedList);
      if (updatedList.length > 0) {
        setSelectedHack(updatedList[0]);
      } else {
        setSelectedHack(null);
        setViewMode('create');
      }
    } catch (e: any) {
      console.error("Error deleting hackathon:", e);
      toast.error(e.message || "Failed to delete event.");
    }
  };

  const sendReply = async (participantId: string) => {
    const text = replyTexts[participantId];
    if (!text || !text.trim() || !user || !selectedHack) return;

    try {
      const payload = {
        hackathon_id: selectedHack.id,
        sender_name: "Organizer",
        text: text.trim(),
        is_reply: true,
        reply_to_sender_id: participantId
      };

      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          content: JSON.stringify(payload)
        });

      if (error) throw error;

      setReplyTexts((prev) => ({ ...prev, [participantId]: "" }));
      toast.success("Reply sent!");
    } catch (e: any) {
      console.error("Error replying to message:", e);
      toast.error(e.message || "Failed to send reply.");
    }
  };

  // Group messages into conversations by participant ID
  const conversations = messages.reduce((acc: Record<string, any[]>, msg) => {
    const pId = msg.is_reply ? msg.reply_to_sender_id : msg.senderId;
    if (pId) {
      if (!acc[pId]) acc[pId] = [];
      acc[pId].push(msg);
    }
    return acc;
  }, {});

  if (loadingHosted) {
    return (
      <div className="min-h-screen bg-hack-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-hack-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading organizer dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 pb-20 max-w-6xl">
      {viewMode === 'dashboard' && selectedHack ? (
        <div className="space-y-6">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className="text-white font-800 text-3xl">Organizer Dashboard</h1>
              <p className="text-white/40 text-sm mt-1">Manage registrations and coordinate with participants</p>
            </div>
            <button
              onClick={() => {
                setEditingHackId(null);
                setForm({
                  name: "", organizer: "", tagline: "", description: "",
                  mode: "Online", location: "", startDate: "", endDate: "",
                  registrationDeadline: "", prizePool: "", teamSize: "2-4",
                  theme: "", tags: [], 
                  requirements: [
                    { id: "fullName", label: "Full Name", type: "text", required: true },
                    { id: "email", label: "Email Address", type: "email", required: true },
                    { id: "college", label: "College / University", type: "text", required: true },
                    { id: "resume", label: "Resume (PDF) / Photo", type: "file", required: true }
                  ],
                  image: ""
                });
                setViewMode('create');
                setStep(1);
              }}
              className="hack-btn-primary py-3 px-6 text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Host a New Hackathon
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar list of Hosted Hackathons */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="text-white font-600 text-sm px-1">Your Hosted Events</h3>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {hostedHackathons.map((h) => {
                  const isSelected = selectedHack.id === h.id;
                  return (
                    <button
                      key={h.id}
                      onClick={() => { setSelectedHack(h); setActiveTab('registrations'); }}
                      className="w-full text-left p-4 rounded-2xl transition-all"
                      style={{
                        background: isSelected ? "rgba(124,92,255,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? "rgba(124,92,255,0.35)" : "rgba(255,255,255,0.06)"}`
                      }}
                    >
                      <div className="text-white font-600 text-sm truncate">{h.title}</div>
                      <div className="text-white/40 text-[10px] mt-1 truncate">{h.organizer}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Hackathon Panel */}
            <div className="lg:col-span-3 space-y-6">
              <div className="hack-card p-6">
                {/* Hackathon summary header */}
                <div className="flex justify-between items-start pb-4 mb-4 gap-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-left flex-1 min-w-0">
                    <span className={`tag text-[10px] inline-block mb-1.5 ${selectedHack.mode === 'Online' ? 'online-tag' : 'offline-tag'}`}>
                      {selectedHack.mode}
                    </span>
                    <h2 className="text-white font-700 text-xl leading-snug truncate">{selectedHack.title}</h2>
                  </div>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    <button
                      onClick={() => {
                        setForm({
                          name: selectedHack.title,
                          organizer: selectedHack.organizer,
                          tagline: "",
                          description: selectedHack.description,
                          mode: selectedHack.mode,
                          location: selectedHack.location || "",
                          startDate: selectedHack.startDate,
                          endDate: selectedHack.endDate,
                          registrationDeadline: selectedHack.registrationDeadline,
                          prizePool: selectedHack.prize,
                          teamSize: selectedHack.teamSize || "2-4",
                          theme: selectedHack.tags[0] || "",
                          tags: selectedHack.tags,
                          requirements: selectedHack.requirements || [],
                          image: selectedHack.image || ""
                        });
                        setEditingHackId(selectedHack.id);
                        setViewMode('create');
                        setStep(1);
                      }}
                      className="hack-btn-secondary px-3 py-2 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-3 py-2 text-xs text-hack-red rounded-xl border border-hack-red/20 hover:bg-hack-red/10 transition-all font-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="flex gap-2 mb-6">
                  {[
                    { id: 'registrations', label: `Registrations (${registrations.length})`, icon: Users },
                    { id: 'messages', label: `Messages (${Object.keys(conversations).length})`, icon: MessageSquare },
                    { id: 'details', label: 'Details Overview', icon: Calendar }
                  ].map((tab) => {
                    const isTabActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-600 transition-all"
                        style={{
                          background: isTabActive ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isTabActive ? "rgba(124,92,255,0.3)" : "rgba(255,255,255,0.07)"}`,
                          color: isTabActive ? "#A78BFF" : "rgba(255,255,255,0.4)"
                        }}
                      >
                        <Icon size={12} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Registrations List */}
                {activeTab === 'registrations' && (
                  <div className="space-y-4">
                    {registrations.length === 0 ? (
                      <div className="text-center py-12 text-white/30 text-sm">
                        No registrations received yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {registrations.map((reg) => (
                          <div
                            key={reg.id}
                            className="p-5 rounded-2xl flex flex-col gap-3.5 transition-all text-left"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                          >
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                              <div>
                                <h4 className="text-white font-600 text-sm">{reg.name}</h4>
                                <p className="text-white/40 text-xs mt-0.5">{reg.email}</p>
                              </div>
                              <div className="flex gap-2 items-center">
                                <span className="text-[10px] text-white/40 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                                  {reg.experience || "Registered"}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="flex items-center gap-2 text-white/60">
                                <GraduationCap size={13} className="text-hack-primary" />
                                <span>{reg.college} • {reg.answers?.department || "N/A"} ({reg.answers?.year || "N/A"})</span>
                              </div>
                              {reg.resume_url && (
                                <div className="flex items-center gap-2 text-hack-primary">
                                  <Link2 size={13} />
                                  <a href={reg.resume_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    Link / Github Portfolio
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Extra Answers details */}
                            {reg.answers && Object.keys(reg.answers).some(k => !['department', 'year', 'whyJoin'].includes(k) && reg.answers[k]) && (
                              <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 text-xs text-white/70">
                                <span className="text-white/40 text-[10px] block">Custom Fields Filled:</span>
                                {Object.entries(reg.answers).map(([key, val]) => {
                                  if (['department', 'year', 'whyJoin'].includes(key) || !val) return null;
                                  return (
                                    <div key={key} className="flex gap-1 justify-between">
                                      <span className="text-white/50 capitalize font-500">{key}:</span>
                                      <span className="text-white font-600">{String(val)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {reg.answers?.whyJoin && (
                              <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 text-xs">
                                <span className="text-white/30 block mb-1">Why do they want to join?</span>
                                <p className="text-white/70 leading-relaxed italic">{reg.answers.whyJoin}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages Chat Board */}
                {activeTab === 'messages' && (
                  <div className="space-y-6">
                    {Object.keys(conversations).length === 0 ? (
                      <div className="text-center py-12 text-white/30 text-sm">
                        No messages or questions from participants yet.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(conversations).map(([participantId, thread]: [string, any[]]) => {
                          const participantName = thread.find(m => !m.is_reply)?.sender_name || "Participant";
                          return (
                            <div
                              key={participantId}
                              className="p-5 rounded-2xl flex flex-col gap-4 text-left"
                              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                            >
                              <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <h4 className="text-white font-600 text-sm flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-hack-primary animate-pulse" />
                                  {participantName}
                                </h4>
                              </div>

                              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 flex flex-col gap-2">
                                {thread.map((m) => {
                                  const isMe = m.is_reply;
                                  return (
                                    <div
                                      key={m.id}
                                      className={`max-w-[85%] rounded-2xl p-3 text-xs ${
                                        isMe
                                          ? "self-end bg-hack-primary/20 text-white border border-hack-primary/25"
                                          : "self-start bg-white/5 text-white/80 border border-white/5"
                                      }`}
                                    >
                                      <div className="text-[10px] text-white/40 mb-1">
                                        {isMe ? "You (Organizer)" : m.sender_name || "Participant"}
                                      </div>
                                      <div className="leading-relaxed break-words">{m.text}</div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={replyTexts[participantId] || ""}
                                  onChange={(e) => setReplyTexts(prev => ({ ...prev, [participantId]: e.target.value }))}
                                  onKeyDown={(e) => e.key === "Enter" && sendReply(participantId)}
                                  placeholder={`Reply to ${participantName}...`}
                                  className="hack-input flex-1 py-2 text-xs"
                                  style={{ borderRadius: "10px" }}
                                />
                                <button
                                  onClick={() => sendReply(participantId)}
                                  className="hack-btn-primary px-4 text-xs"
                                  style={{ borderRadius: "10px" }}
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="space-y-4 text-sm text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Organizer", value: selectedHack.organizer },
                        { label: "Category / Theme", value: selectedHack.tags.join(", ") || "General" },
                        { label: "Dates", value: `${selectedHack.startDate} to ${selectedHack.endDate}` },
                        { label: "Registration Deadline", value: selectedHack.registrationDeadline },
                        { label: "Maximum Participants Limit", value: selectedHack.maxParticipants },
                        { label: "Team Size Allowed", value: selectedHack.teamSize || "2-4" }
                      ].map((item) => (
                        <div key={item.label} className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span className="text-white/40 text-xs block mb-0.5">{item.label}</span>
                          <span className="text-white font-500">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    {selectedHack.image && (
                      <div className="p-3.5 rounded-xl text-left" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span className="text-white/40 text-xs block mb-2">Cover Photo URL</span>
                        <a href={selectedHack.image} target="_blank" rel="noreferrer" className="text-hack-primary text-xs hover:underline truncate block">
                          {selectedHack.image}
                        </a>
                      </div>
                    )}
                    <div className="p-3.5 rounded-xl space-y-1.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="text-white/40 text-xs block">Description</span>
                      <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{selectedHack.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Host/Create Hackathon Wizard Form */
        <div>
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-white font-700 text-2xl mb-1">{editingHackId ? "Edit Hackathon" : "Host a Hackathon"}</h1>
              <p className="text-white/40 text-sm">{editingHackId ? "Update your event details" : "Create and publish your hackathon event"}</p>
            </div>
            {hostedHackathons.length > 0 && (
              <button
                onClick={() => {
                  setViewMode('dashboard');
                  setEditingHackId(null);
                }}
                className="hack-btn-secondary py-2 px-4 text-xs flex items-center gap-1.5"
              >
                <ArrowLeft size={13} />
                Back to Dashboard
              </button>
            )}
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
              <div className="space-y-5 text-left">
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
                  <label className="block text-white/60 text-sm font-500 mb-2">Cover Photo URL</label>
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => update("image", e.target.value)}
                    placeholder="e.g., https://images.unsplash.com/photo-..."
                    className="hack-input"
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
              <div className="space-y-5 text-left">
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
                  <label className="block text-white/60 text-sm font-500 mb-2">Team Size *</label>
                  <input
                    type="text"
                    value={form.teamSize}
                    onChange={(e) => update("teamSize", e.target.value)}
                    placeholder="e.g., 2-4, Solo, Up to 8"
                    className="hack-input"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Prizes & Rules */}
            {step === 3 && (
              <div className="space-y-5 text-left">
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

            {/* Step 4: Participant Requirements Form Builder */}
            {step === 4 && (
              <div className="space-y-6 text-left">
                <div>
                  <h2 className="text-white font-700 text-lg">Participant Registration Fields</h2>
                  <p className="text-white/50 text-xs mt-1">
                    Design the exact details participants must provide when registering.
                  </p>
                </div>

                {/* Requirements List */}
                <div className="space-y-2.5">
                  {form.requirements.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3.5 rounded-xl text-sm"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <div>
                        <span className="text-white font-600">{req.label}</span>
                        <span className="text-white/40 text-[10px] ml-2 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md font-mono uppercase">
                          {req.type}
                        </span>
                        {req.required && (
                          <span className="text-hack-red text-[10px] ml-2 font-600 uppercase tracking-wider">
                            Required
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => update("requirements", form.requirements.filter((r) => r.id !== req.id))}
                        className="text-white/30 hover:text-hack-red transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Form Builder Section */}
                <div className="p-5 rounded-2xl space-y-4 bg-white/3 border border-white/6">
                  <h3 className="text-white font-600 text-sm">Add a Custom Field</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/60 text-xs mb-1.5">Field Name / Label</label>
                      <input
                        type="text"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="e.g., University Roll Number, Photo Upload"
                        className="hack-input py-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1.5">Input Field Type</label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                        className="hack-input py-2.5 text-xs"
                      >
                        <option value="text" style={{ background: "#131826" }}>Text Field</option>
                        <option value="number" style={{ background: "#131826" }}>Number</option>
                        <option value="email" style={{ background: "#131826" }}>Email Address</option>
                        <option value="textarea" style={{ background: "#131826" }}>Paragraph Text</option>
                        <option value="file" style={{ background: "#131826" }}>Photo / File Upload</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="requiredCheck"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                      className="rounded border-white/20 bg-transparent text-hack-primary focus:ring-0"
                    />
                    <label htmlFor="requiredCheck" className="text-white/60 text-xs cursor-pointer">
                      Is this field required?
                    </label>
                  </div>
                  <button
                    onClick={addCustomRequirement}
                    className="hack-btn-secondary w-full justify-center text-xs py-2"
                  >
                    <Plus size={13} />
                    Add Field
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div className="space-y-5 text-left">
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
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="hack-btn-primary w-full justify-center py-3 text-base disabled:opacity-50"
                >
                  <Globe size={16} className={isPublishing ? "animate-spin" : ""} />
                  {isPublishing ? (editingHackId ? "Updating..." : "Publishing...") : (editingHackId ? "Update Hackathon" : "Publish Hackathon")}
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
      )}
    </div>
  );
}
