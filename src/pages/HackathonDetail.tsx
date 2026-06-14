
import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import HackathonRegistrationModal from "@/components/features/HackathonRegistrationModal";
import {
  ArrowLeft, Calendar, Users, MapPin, Trophy, Clock, Share2,
  Bookmark, CheckCircle, Globe, Mail, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { deserializeHackathon } from "@/lib/utils";
import { Hackathon } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const TIMELINE = [
  { date: "Jun 15", label: "Registration Closes", status: "upcoming" },
  { date: "Jun 20", label: "Hackathon Starts", status: "upcoming" },
  { date: "Jun 21", label: "Mentoring Session", status: "upcoming" },
  { date: "Jun 22", label: "Submission Deadline", status: "upcoming" },
  { date: "Jun 25", label: "Results Announcement", status: "upcoming" },
];

const PRIZES = [
  { place: "1st Place", amount: "₹50,000", extras: ["Gold Medal", "Job Interview", "Mentorship"] },
  { place: "2nd Place", amount: "₹30,000", extras: ["Silver Medal", "Swag Kit"] },
  { place: "3rd Place", amount: "₹20,000", extras: ["Bronze Medal"] },
];

const FAQS = [
  { q: "Who can participate?", a: "Students and professionals from all backgrounds are welcome." },
  { q: "Can I participate solo?", a: "No, teams of 2-5 members are required." },
  { q: "Is this hackathon free?", a: "Yes, participation is completely free." },
];

export default function HackathonDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [hack, setHack] = useState<Hackathon | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  
  // Real-time Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

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
          setHack(deserializeHackathon(data));
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
                // Prevent duplicate additions
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

  if (loading || !hack) {
    return (
      <div className="min-h-screen bg-hack-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-hack-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading hackathon details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 lg:p-8 pb-20 max-w-6xl">
        {/* Back */}
        <Link to="/discover" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
          <ArrowLeft size={15} />
          Back to Discover
        </Link>

        {/* Hero */}
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
                { icon: Users, label: "Participants", value: `${hack.participants}+`, color: "#4F7CFF" },
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
                Join thousands of innovators from across the country to solve pressing challenges
                using cutting-edge technology. This hackathon provides participants with resources,
                mentorship, and exposure to industry leaders.
              </p>
            </div>

            {/* Timeline */}
            <div className="hack-card p-6">
              <h2 className="text-white font-700 text-lg mb-4">Timeline</h2>
              <div className="space-y-4">
                {TIMELINE.map((event, i) => (
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

            {/* Prizes */}
            <div className="hack-card p-6">
              <h2 className="text-white font-700 text-lg mb-4">Prizes & Rewards</h2>
              <div className="space-y-3">
                {PRIZES.map((prize, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-700 text-sm flex-shrink-0"
                      style={{
                        background: i === 0 ? "rgba(245,158,11,0.15)" : i === 1 ? "rgba(200,200,200,0.1)" : "rgba(180,120,50,0.1)",
                        color: i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : "#CD7F32",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-600 text-sm">{prize.place}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {prize.extras.map((e) => (
                          <span key={e} className="tag text-[10px]">{e}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-hack-primary font-700 text-lg">{prize.amount}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="hack-card p-6">
              <h2 className="text-white font-700 text-lg mb-4">FAQs</h2>
              <div className="space-y-3">
                {FAQS.map((faq, i) => (
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
                  <span className="text-white/60">{hack.participants}/{hack.maxParticipants || 500}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(hack.participants / (hack.maxParticipants || 500)) * 100}%` }} />
                </div>
              </div>

              <button
                onClick={() => setRegistrationOpen(true)}
                className="hack-btn-primary w-full justify-center py-3 text-base"
              >
                Register Now
              </button>
              <button className="hack-btn-secondary w-full justify-center mt-2 py-2.5">
                Create Team
              </button>
            </div>

            {/* Tags */}
            <div className="hack-card p-5">
              <h3 className="text-white font-600 text-sm mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {hack.tags.map((tag) => (
                  <span key={tag} className="skill-tag">{tag}</span>
                ))}
              </div>
            </div>

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

      <HackathonRegistrationModal
        hack={hack}
        isOpen={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        customFields={hack.requirements}
      />
    </>
  );
}
