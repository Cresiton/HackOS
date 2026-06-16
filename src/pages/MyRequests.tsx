import { useState } from "react";
import { CheckCircle, X, Clock, Eye, Send, Users, ArrowRight, Plus } from "lucide-react";
import { LIVE_TEAM_REQUESTS } from "@/lib/mockData";
import { toast } from "sonner";

const SENT_REQUESTS = [
  {
    id: "sr1",
    teamName: "Quantum Coders",
    hackathon: "AI Innovation Challenge",
    role: "Full Stack Developer",
    date: "Jun 10, 2026",
    status: "pending" as const,
    leader: "Vikram S",
    message: "I'm excited to contribute my React + Node.js skills!",
  },
  {
    id: "sr2",
    teamName: "DataMinds",
    hackathon: "Smart India Hackathon",
    role: "Backend Developer",
    date: "Jun 8, 2026",
    status: "accepted" as const,
    leader: "Neha P",
    message: "Would love to build the API layer for this project.",
  },
  {
    id: "sr3",
    teamName: "ByteWave",
    hackathon: "FinHack 2026",
    role: "ML Engineer",
    date: "Jun 5, 2026",
    status: "rejected" as const,
    leader: "Arun M",
    message: "Looking to apply ML to fintech problems.",
  },
];

const RECEIVED_REQUESTS = [
  {
    id: "rr1",
    teamName: "Mission Possible",
    leader: "Rahul Kumar",
    hackathon: "AI Innovation Challenge",
    role: "ML Engineer",
    message: "We need your AI skills! Our team is strong in frontend and backend.",
    date: "2 mins ago",
    matchScore: 95,
    leaderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=rahul",
  },
  {
    id: "rr2",
    teamName: "Design Dynasty",
    leader: "Ananya Mehta",
    hackathon: "Smart India Hackathon",
    role: "Full Stack Developer",
    message: "We're a design-first team and need a solid developer!",
    date: "1 hour ago",
    matchScore: 88,
    leaderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ananya",
  },
];

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: Clock },
  accepted: { label: "Accepted", color: "#22C55E", bg: "rgba(34,197,94,0.12)", icon: CheckCircle },
  rejected: { label: "Rejected", color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: X },
  withdrawn: { label: "Withdrawn", color: "#9CA3AF", bg: "rgba(156,163,175,0.12)", icon: X },
};

type RequestStatus = keyof typeof STATUS_CONFIG;

export default function MyRequests() {
  const [activeTab, setActiveTab] = useState<"sent" | "received" | "live">("received");

  return (
    <div className="p-6 lg:p-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-700 text-2xl mb-1">My Requests</h1>
          <p className="text-white/40 text-sm">Manage team invitations and join requests</p>
        </div>
        <button
          onClick={() => toast.success("Create request coming soon!")}
          className="hack-btn-primary"
        >
          <Plus size={16} />
          Create Request
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {[
          { key: "received", label: "Received", count: RECEIVED_REQUESTS.length },
          { key: "sent", label: "Sent", count: SENT_REQUESTS.length },
          { key: "live", label: "Live Requests", count: LIVE_TEAM_REQUESTS.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className="px-5 py-2.5 rounded-lg text-sm font-600 transition-all flex items-center gap-2"
            style={{
              background: activeTab === tab.key ? "#131826" : "transparent",
              color: activeTab === tab.key ? "white" : "rgba(255,255,255,0.45)",
            }}
          >
            {tab.label}
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-700"
              style={{
                background: activeTab === tab.key ? "rgba(124,92,255,0.2)" : "rgba(255,255,255,0.08)",
                color: activeTab === tab.key ? "#A78BFF" : "rgba(255,255,255,0.4)",
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Received Requests */}
      {activeTab === "received" && (
        <div className="space-y-4">
          {RECEIVED_REQUESTS.map((req) => (
            <div key={req.id} className="hack-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-hack-primary/20">
                    <img src={req.leaderAvatar} alt={req.leader} className="w-full h-full" />
                  </div>
                  <div>
                    <h3 className="text-white font-700 text-base">{req.teamName}</h3>
                    <div className="text-white/40 text-xs">by {req.leader} · {req.hackathon}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-sm font-700"
                    style={{ color: req.matchScore >= 90 ? "#22C55E" : "#4F7CFF" }}
                  >
                    {req.matchScore}% Match
                  </div>
                  <div className="text-white/30 text-xs">{req.date}</div>
                </div>
              </div>

              <div
                className="p-3 rounded-xl mb-4 text-sm text-white/60 italic"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                "{req.message}"
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">Role needed:</span>
                  <span className="skill-tag">{req.role}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toast.error(`Declined ${req.teamName}`)}
                    className="hack-btn-secondary px-4 py-2 text-sm"
                    style={{ color: "rgba(239,68,68,0.7)" }}
                  >
                    <X size={14} />
                    Decline
                  </button>
                  <button
                    onClick={() => toast.success(`Accepted! You've joined ${req.teamName} 🎉`)}
                    className="hack-btn-primary px-5 py-2 text-sm"
                  >
                    <CheckCircle size={14} />
                    Accept
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sent Requests */}
      {activeTab === "sent" && (
        <div className="space-y-4">
          {SENT_REQUESTS.map((req) => {
            const s = STATUS_CONFIG[req.status as RequestStatus];
            return (
              <div key={req.id} className="hack-card p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-700 text-base">{req.teamName}</h3>
                    <div className="text-white/40 text-xs">{req.hackathon} · Applied for: <span className="text-white/60">{req.role}</span></div>
                  </div>
                  <span
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600"
                    style={{ background: s.bg, color: s.color }}
                  >
                    <s.icon size={11} />
                    {s.label}
                  </span>
                </div>

                <div
                  className="p-3 rounded-xl mb-4 text-xs text-white/50 italic"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  "{req.message}"
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/30 text-xs">Sent {req.date}</span>
                  <div className="flex gap-2">
                    {req.status === "pending" && (
                      <button
                        onClick={() => toast.success("Request withdrawn")}
                        className="hack-btn-secondary px-4 py-2 text-xs"
                      >
                        Withdraw
                      </button>
                    )}
                    {req.status === "accepted" && (
                      <button
                        onClick={() => toast.success("Opening team workspace...")}
                        className="hack-btn-primary px-4 py-2 text-xs"
                      >
                        Open Team <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Requests */}
      {activeTab === "live" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LIVE_TEAM_REQUESTS.map((req) => (
            <div key={req.id} className="hack-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{req.icon}</span>
                  <h3 className="text-white font-700">{req.teamName}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <div className="status-online" />
                  <span className="text-white/30 text-xs">Live</span>
                </div>
              </div>

              <div
                className="text-sm font-500 mb-2"
                style={{ color: req.color || "#7C5CFF" }}
              >
                Needs: {req.requiredRole}
              </div>

              <div className="text-white/40 text-xs mb-4">
                {req.members}/{req.maxMembers} Members · {req.location} · {req.hackathon}
              </div>

              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-700"
                  style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}
                >
                  {req.matchScore}% Match
                </div>
                <button
                  onClick={() => toast.success(`Request sent to ${req.teamName}!`)}
                  className="hack-btn-primary py-2 px-4 text-xs"
                >
                  <Send size={12} />
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
