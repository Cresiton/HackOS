import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";

import {
  ArrowLeft, Calendar, Users, MapPin, Trophy, Clock, Share2,
  Bookmark, CheckCircle, Globe, Mail, ChevronRight, FileText, ListOrdered, ShieldAlert, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { deserializeHackathon } from "@/lib/utils";
import { Hackathon } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function HackathonDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [hack, setHack] = useState<Hackathon | null>(null);
  const [loading, setLoading] = useState(true);

  const [isRegistered, setIsRegistered] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  
  // Real-time Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Dynamic Data Generators
  const getProblemStatements = (h: Hackathon) => {
    const descLower = (h.description || "").toLowerCase();
    if (descLower.includes("problem statement") || descLower.includes("challenges")) {
      const idx = Math.max(descLower.indexOf("problem statement"), descLower.indexOf("challenges"));
      const remaining = h.description.substring(idx).split("\n").slice(1, 6);
      const extracted = remaining.map(l => l.replace(/^[-*•\s\d.]+/g, "").trim()).filter(l => l.length > 8);
      if (extracted.length > 0) return extracted;
    }
    const mainTag = h.tags?.[0] || "Innovation";
    return [
      `Design and build a scalable solution addressing real-world challenges in ${mainTag}.`,
      `Develop a high-performance, user-friendly prototype focusing on accessibility and seamless integration.`,
      `Create an innovative approach to optimize workflows or data representation in the context of ${h.title}.`
    ];
  };

  const getTracks = (h: Hackathon) => {
    if (h.tags && h.tags.length > 0) {
      return h.tags.map(t => `${t} Track`);
    }
    return ["General Innovation", "AI/ML Track", "Next-Gen Web & Apps"];
  };

  const getTimeline = (h: Hackathon) => {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "TBD";
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    };
    return [
      { date: formatDate(h.registrationDeadline), label: "Registration Closes", status: "upcoming" },
      { date: formatDate(h.startDate), label: "Hackathon Starts", status: "upcoming" },
      { date: formatDate(h.startDate), label: "Opening Ceremony & Mentoring", status: "upcoming" },
      { date: formatDate(h.endDate), label: "Submission Deadline", status: "upcoming" },
      { date: formatDate(h.endDate), label: "Results Announcement", status: "upcoming" },
    ];
  };

  const getRules = (h: Hackathon) => {
    const size = h.teamSize || "2-4";
    return [
      `Teams must consist of ${size} members. Solo participation is not permitted.`,
      "All code and assets must be created during the official hacking window.",
      "Plagiarism or using pre-existing full projects will lead to immediate disqualification.",
      "Decisions made by the judging panel and organizers are final and binding.",
      "Submissions must include a demo video (max 3 mins) and a working code repository link."
    ];
  };

  const getFAQs = (h: Hackathon) => {
    return [
      { q: "Who can participate?", a: "Anyone interested in building cool technology is welcome! Students, professionals, and hobbyists alike." },
      { q: "How does team formation work?", a: `Teams must consist of ${h.teamSize || "2-4"} members. You can find teammates in our Team Discovery page or create a team after registering.` },
      { q: "Is there a registration fee?", a: "No, participation in this hackathon is completely free." },
      { q: "What is the judging criteria?", a: "Projects will be judged on Innovation, Technical Complexity, Practicality/Impact, and the Quality of the submission and demo." }
    ];
  };

  const refreshRegistrationStatus = useCallback(async () => {
    if (!id) return;
    try {
      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("hackathon_id", id);
      if (count !== null) {
        setParticipantsCount(count);
      }
    } catch (e) {
      console.error("Error fetching exact participant count:", e);
    }
    if (user) {
      try {
        const { data } = await supabase
          .from("registrations")
          .select("id")
          .eq("hackathon_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsRegistered(!!data);
      } catch (e) {
        console.error("Error checking user registration status:", e);
      }
    }
  }, [id, user]);

  useEffect(() => {
    async function loadHackathon() {
      try {
        const { data, error } = await supabase
          .from("hackathons")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const deserialized = deserializeHackathon(data);
          setHack(deserialized);
          setParticipantsCount(deserialized.participants);
        } else {
          setHack(null);
        }
      } catch (err) {
        console.error("Error loading hackathon details from Supabase:", err);
        setHack(null);
      } finally {
        setLoading(false);
      }
    }
    loadHackathon();
  }, [id]);

  useEffect(() => {
    if (hack) {
      refreshRegistrationStatus();
    }
  }, [hack, refreshRegistrationStatus]);

  useEffect(() => {
    if (!user || !id) return;

    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (data) {
          const chatHistory = data.map((msg: any) => {
            try {
              const contentObj = JSON.parse(msg.content);
              return {
                id: msg.id,
                senderId: msg.sender_id,
                createdAt: msg.created_at,
                ...contentObj
              };
            } catch (e) {
              return null;
            }
          }).filter((msg: any) => 
            msg && 
            msg.hackathon_id === id && 
            (msg.senderId === user.id || msg.reply_to_sender_id === user.id)
          );
          setMessages(chatHistory);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    }
    loadMessages();

    // Subscribe to new messages for true real-time communication
    const channel = supabase
      .channel(`chat-${id}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          try {
            const newMsg = payload.new;
            const contentObj = JSON.parse(newMsg.content);
            if (
              contentObj.hackathon_id === id &&
              (newMsg.sender_id === user.id || contentObj.reply_to_sender_id === user.id)
            ) {
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
            // Ignore parse errors from other messages
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id, user?.id]);

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    if (!user || !hack) {
      toast.error("Please login to send questions to the organizer.");
      return;
    }

    setSendingMsg(true);
    try {
      const payload = {
        hackathon_id: hack.id,
        sender_name: user.name,
        text: msgText.trim()
      };

      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          content: JSON.stringify(payload)
        });

      if (error) throw error;
      setMsgText("");
      toast.success("Question sent to organizer!");
    } catch (err: any) {
      console.error("Error sending question:", err);
      toast.error(err.message || "Failed to send message.");
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-hack-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-hack-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading hackathon details...</p>
        </div>
      </div>
    );
  }

  if (!hack) {
    return (
      <div className="min-h-screen bg-hack-bg flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-5xl">🔍</div>
        <h2 className="text-white font-700 text-xl">Hackathon Not Found</h2>
        <p className="text-white/40 text-sm max-w-xs">This event may have been deleted or is not live.</p>
        <Link to="/discover" className="hack-btn-primary px-5 py-2 text-xs">
          Discover Other Hackathons
        </Link>
      </div>
    );
  }

  const problemStatements = getProblemStatements(hack);
  const tracks = getTracks(hack);
  const timeline = getTimeline(hack);
  const rules = getRules(hack);
  const faqs = getFAQs(hack);

  return (
    <>
      <div className="p-6 lg:p-8 pb-20 max-w-6xl">
        {/* Back */}
        <Link to="/discover" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
          <ArrowLeft size={15} />
          Back to Discover
        </Link>

        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden mb-8 h-72">
          <img src={hack.image} alt={hack.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-hack-bg via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex gap-2 mb-3">
                  {hack.featured && <span className="featured-tag">Featured</span>}
                  <span className={`tag ${hack.mode === "Online" ? "online-tag" : "offline-tag"}`}>{hack.mode}</span>
                </div>
                <h1 className="text-white font-800 text-3xl mb-1">{hack.title}</h1>
                <p className="text-white/60 text-sm">by {hack.organizer}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toast.success("Saved to bookmarks!")}
                  className="hack-btn-secondary p-2.5"
                >
                  <Bookmark size={16} />
                </button>
                <button className="hack-btn-secondary p-2.5">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Trophy, label: "Prize Pool", value: hack.prize, color: "#7C5CFF" },
                { icon: Users, label: "Participants", value: `${participantsCount}+`, color: "#4F7CFF" },
                { icon: Clock, label: "Days Left", value: `${hack.daysLeft}d`, color: "#F59E0B" },
                { icon: Users, label: "Team Size", value: hack.teamSize || "2-4", color: "#22C55E" },
              ].map((stat) => (
                <div key={stat.label} className="hack-card p-4 text-center">
                  <stat.icon size={16} style={{ color: stat.color }} className="mx-auto mb-2" />
                  <div className="text-white font-700 text-lg">{stat.value}</div>
                  <div className="text-white/40 text-[10px]">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="hack-card p-6">
              <h2 className="text-white font-700 text-lg mb-3">About This Hackathon</h2>
              <p className="text-white/60 text-sm leading-relaxed">{hack.description}</p>
              <p className="text-white/60 text-sm leading-relaxed mt-3">
                Join innovators to solve pressing challenges using cutting-edge technology. 
                This hackathon provides participants with resources, mentorship, and exposure to industry leaders.
              </p>
            </div>

            {/* Problem Statements */}
            <div className="hack-card p-6">
              <h2 className="text-white font-700 text-lg mb-4 flex items-center gap-2">
                <FileText size={18} className="text-hack-primary" />
                Problem Statements
              </h2>
              <div className="space-y-3">
                {problemStatements.map((statement, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl flex gap-3 text-left"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="text-hack-primary font-700 text-sm">{idx + 1}.</div>
                    <div className="text-white/80 text-sm leading-relaxed">{statement}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracks */}
            <div className="hack-card p-6">
              <h2 className="text-white font-700 text-lg mb-4 flex items-center gap-2">
                <ListOrdered size={18} className="text-hack-green" />
                Event Tracks
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tracks.map((track, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl text-left"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="text-white font-600 text-sm mb-1">{track}</div>
                    <div className="text-white/40 text-xs">Build custom integrations & unique features.</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="hack-card p-6">
              <h2 className="text-white font-700 text-lg mb-4">Timeline</h2>
              <div className="space-y-4">
                {timeline.map((event, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div
                      className="w-16 text-center text-xs font-600 px-2 py-1.5 rounded-lg flex-shrink-0"
                      style={{ background: "rgba(124,92,255,0.1)", color: "#A78BFF" }}
                    >
                      {event.date}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: i === 0 ? "#22C55E" : "rgba(255,255,255,0.2)" }}
                      />
                      <span className="text-white/70 text-sm">{event.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="hack-card p-6">
              <h2 className="text-white font-700 text-lg mb-4 flex items-center gap-2">
                <ShieldAlert size={18} className="text-hack-orange" />
                Rules & Guidelines
              </h2>
              <ul className="space-y-3">
                {rules.map((rule, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-2xl text-white/70 text-sm leading-relaxed flex items-start gap-3"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-hack-orange mt-2 flex-shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* FAQ */}
            <div className="hack-card p-6">
              <h2 className="text-white font-700 text-lg mb-4 flex items-center gap-2">
                <HelpCircle size={18} className="text-[#4F7CFF]" />
                FAQs
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div key={i} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-white font-600 text-sm mb-1.5">{faq.q}</div>
                    <div className="text-white/50 text-xs leading-relaxed">{faq.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Register CTA */}
            <div className="hack-card p-6">
              <div className="text-center mb-5">
                <div className="text-hack-primary font-700 text-2xl mb-1">{hack.prize}</div>
                <div className="text-white/40 text-xs">Total Prize Pool</div>
              </div>
              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Deadline</span>
                  <span className="text-white font-500">{hack.registrationDeadline}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Mode</span>
                  <span className={`font-500 ${hack.mode === "Online" ? "text-hack-green" : "text-hack-orange"}`}>{hack.mode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Team Size</span>
                  <span className="text-white font-500">{hack.teamSize || "2-4"} members</span>
                </div>
              </div>

              {/* Registration spots bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/40">Registration</span>
                  <span className="text-white/60">{participantsCount}/{hack.maxParticipants || 500}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (participantsCount / (hack.maxParticipants || 500)) * 100)}%` }} />
                </div>
              </div>

              {isRegistered ? (
                <button
                  disabled
                  className="hack-btn-secondary w-full justify-center py-3 text-base border-hack-green/30 text-hack-green/80 flex items-center gap-2 cursor-not-allowed"
                >
                  <CheckCircle size={16} className="text-hack-green" />
                  Registered
                </button>
              ) : (
                <Link to={`/register-hackathon/${hack.id}`} className="block w-full">
                  <button className="hack-btn-primary w-full justify-center py-3 text-base">
                    Register
                  </button>
                </Link>
              )}
            </div>

            {/* Tags */}
            <div className="hack-card p-5 text-left">
              <h3 className="text-white font-600 text-sm mb-3">Category</h3>
              <div className="mb-4">
                <span className="text-sm font-700 px-3.5 py-1.5 rounded-xl bg-hack-primary/20 text-[#A78BFF] border border-hack-primary/30 inline-block">
                  {hack.category || "General"}
                </span>
              </div>
              <h3 className="text-white font-600 text-xs mb-2 text-white/40">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {hack.tags.map((tag) => (
                  <span key={tag} className="skill-tag">{tag}</span>
                ))}
              </div>
            </div>

            {/* Custom Basic Info Fields */}
            {hack.customFields && hack.customFields.length > 0 && (
              <div className="hack-card p-5 text-left space-y-3">
                <h3 className="text-white font-600 text-sm">Additional Info</h3>
                <div className="space-y-3.5">
                  {hack.customFields.map((field) => (
                    <div key={field.id} className="text-sm">
                      <span className="text-white/40 block text-xs mb-0.5">{field.label}</span>
                      {field.type === "file" && field.value ? (
                        <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-hack-primary hover:underline break-all block text-xs">
                          {field.value}
                        </a>
                      ) : (
                        <span className="text-white font-500 break-words">{field.value || "N/A"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizer */}
            <div className="hack-card p-5">
              <h3 className="text-white font-600 text-sm mb-3">Organizer</h3>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-700"
                  style={{ background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
                >
                  {hack.organizer.charAt(0)}
                </div>
                <div>
                  <div className="text-white font-600 text-sm">{hack.organizer}</div>
                  <div className="text-white/40 text-xs">Verified Organizer</div>
                </div>
              </div>
            </div>

            {/* Ask the Organizer */}
            <div className="hack-card p-5 space-y-4">
              <h3 className="text-white font-600 text-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-hack-primary animate-pulse" />
                Ask the Organizer
              </h3>

              {/* Chat Thread */}
              {user ? (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1 flex flex-col gap-2">
                  {messages.length === 0 ? (
                    <p className="text-white/30 text-xs text-center py-4">No questions sent yet. Ask something about this event!</p>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderId === user.id;
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[85%] rounded-2xl p-2.5 text-xs ${
                            isMe
                              ? "self-end bg-hack-primary/20 text-white border border-hack-primary/25"
                              : "self-start bg-white/5 text-white/80 border border-white/5"
                          }`}
                        >
                          <div className="text-[10px] text-white/40 mb-1">
                            {isMe ? "You" : m.sender_name || "Organizer"}
                          </div>
                          <div className="leading-relaxed break-words">{m.text}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <p className="text-white/30 text-xs text-center py-4">
                  Please log in to chat with the organizer.
                </p>
              )}

              {user && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type your question..."
                    disabled={sendingMsg}
                    className="hack-input flex-1 py-2 text-xs"
                    style={{ borderRadius: "10px" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sendingMsg}
                    className="hack-btn-primary px-3 text-xs"
                    style={{ borderRadius: "10px" }}
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
