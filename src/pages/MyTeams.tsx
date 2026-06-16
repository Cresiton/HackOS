import { useState } from "react";
import {
  Plus, Users, Calendar, ArrowRight, Settings, MessageSquare,
  LayoutGrid, CheckCircle, Clock, Star, ExternalLink
} from "lucide-react";
import { MY_TEAMS } from "@/lib/mockData";
import { Team } from "@/types";
import { toast } from "sonner";

const STATUS_CONFIG = {
  recruiting: { label: "Recruiting", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  ready: { label: "Ready", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  active: { label: "Active", color: "#4F7CFF", bg: "rgba(79,124,255,0.12)" },
  completed: { label: "Completed", color: "#9CA3AF", bg: "rgba(156,163,175,0.12)" },
};

const TABS = ["Overview", "Tasks", "Files", "Chat", "Activity"];

function TeamDetailPanel({ team, onClose }: { team: Team; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const status = STATUS_CONFIG[team.status];

  return (
    <div
      className="fixed inset-y-0 right-0 w-[480px] z-50 flex flex-col"
      style={{
        background: "#0E111B",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="p-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: `${team.color}15`, border: `1px solid ${team.color}25` }}
            >
              {team.icon}
            </div>
            <div>
              <h2 className="text-white font-700 text-lg">{team.name}</h2>
              <div className="text-white/40 text-xs">{team.hackathon}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 p-1">✕</button>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1 rounded-full text-xs font-600"
            style={{ background: status.bg, color: status.color }}
          >
            {status.label}
          </span>
          <span className="text-white/40 text-xs">{team.members.length}/{team.maxMembers} Members</span>
          {team.requiredRoles.length > 0 && (
            <span
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}
            >
              Needs: {team.requiredRoles.join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex px-4 pt-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-500 transition-all relative ${
              activeTab === tab ? "text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "#7C5CFF" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "Overview" && (
          <div className="space-y-5">
            <div>
              <p className="text-white/60 text-sm leading-relaxed">{team.description}</p>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white/40 text-xs">Progress</span>
                <span className="text-white font-600 text-sm">{team.progress}%</span>
              </div>
              <div className="progress-bar h-2 rounded-full">
                <div className="progress-fill h-full rounded-full" style={{ width: `${team.progress}%` }} />
              </div>
            </div>

            <div>
              <h3 className="text-white font-600 text-sm mb-3">Team Members</h3>
              <div className="space-y-3">
                {team.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-hack-primary/20">
                      <img src={member.avatar} alt={member.name} className="w-full h-full" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-500">{member.name}</div>
                      <div className="text-white/40 text-xs">{member.role}</div>
                    </div>
                    <button className="text-white/30 hover:text-white/60">
                      <MessageSquare size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Tasks" && (
          <div>
            <div className="grid grid-cols-2 gap-3">
              {["Todo", "In Progress", "Testing", "Done"].map((col) => (
                <div
                  key={col}
                  className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="text-white/60 text-xs font-600 mb-3">{col}</div>
                  <div className="space-y-2">
                    {Array.from({ length: col === "Done" ? 3 : col === "Todo" ? 4 : 2 }).map((_, i) => (
                      <div key={i} className="p-2 rounded-lg text-xs text-white/50" style={{ background: "rgba(255,255,255,0.04)" }}>
                        {["Set up auth", "API routes", "Dashboard UI", "AI integration", "Testing", "Deploy"][i] || "Task " + (i + 1)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Chat" && (
          <div className="flex flex-col h-full">
            <div className="space-y-3 flex-1">
              {[
                { name: "Priya K", msg: "Just pushed the ML model!", time: "10:30 AM" },
                { name: "Rahul M", msg: "Dashboard looks great 🔥", time: "11:15 AM" },
                { name: "Alex S", msg: "Good work team! Deployment tomorrow?", time: "11:45 AM" },
              ].map((msg, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-hack-primary/30 flex-shrink-0 flex items-center justify-center text-xs text-white">{msg.name[0]}</div>
                  <div>
                    <div className="text-white/60 text-[11px] mb-0.5">{msg.name} · {msg.time}</div>
                    <div
                      className="text-sm text-white/80 px-3 py-2 rounded-2xl inline-block"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {msg.msg}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <input type="text" placeholder="Message team..." className="hack-input flex-1 py-2 text-sm" />
              <button
                onClick={() => toast.success("Message sent!")}
                className="hack-btn-primary py-2 px-4"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {["Files", "Activity"].includes(activeTab) && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-white/40 text-sm">{activeTab} coming soon</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => toast.success("Opening workspace...")}
          className="hack-btn-primary w-full justify-center py-2.5"
        >
          <ExternalLink size={14} />
          Open Full Workspace
        </button>
      </div>
    </div>
  );
}

export default function MyTeams() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Recruiting", "Active", "Completed"];
  const filtered = MY_TEAMS.filter((t) => {
    if (activeFilter === "All") return true;
    return t.status.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="p-6 lg:p-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-700 text-2xl mb-1">My Teams</h1>
          <p className="text-white/40 text-sm">{MY_TEAMS.length} active teams</p>
        </div>
        <button
          onClick={() => toast.success("Team creation coming soon!")}
          className="hack-btn-primary"
        >
          <Plus size={16} />
          Create Team
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="px-4 py-2 rounded-xl text-sm font-500 transition-all"
            style={{
              background: activeFilter === f ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.04)",
              color: activeFilter === f ? "#A78BFF" : "rgba(255,255,255,0.45)",
              border: `1px solid ${activeFilter === f ? "rgba(124,92,255,0.25)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((team) => {
          const status = STATUS_CONFIG[team.status];
          return (
            <div
              key={team.id}
              className="hack-card p-6 cursor-pointer"
              onClick={() => setSelectedTeam(team)}
            >
              {/* Team Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                    style={{ background: `${team.color}15`, border: `1px solid ${team.color}25` }}
                  >
                    {team.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-700 text-base">{team.name}</h3>
                    <div className="text-white/40 text-xs">{team.hackathon}</div>
                  </div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-600"
                  style={{ background: status.bg, color: status.color }}
                >
                  {status.label}
                </span>
              </div>

              <p className="text-white/40 text-xs leading-relaxed mb-4 line-clamp-2">
                {team.description}
              </p>

              {/* Members */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex -space-x-2">
                  {team.members.slice(0, 4).map((m, i) => (
                    <div
                      key={m.id}
                      className="w-8 h-8 rounded-full overflow-hidden border-2"
                      style={{ borderColor: "#131826", background: `hsl(${i * 60 + 200}, 60%, 50%)` }}
                    >
                      <img src={m.avatar} alt={m.name} className="w-full h-full" />
                    </div>
                  ))}
                  {team.maxMembers - team.members.length > 0 && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] text-white/50 border-2"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "#131826" }}
                    >
                      +{team.maxMembers - team.members.length}
                    </div>
                  )}
                </div>
                <span className="text-white/30 text-xs">{team.members.length}/{team.maxMembers} members</span>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/40">Progress</span>
                  <span className="text-white/60 font-600">{team.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${team.progress}%` }} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="hack-btn-primary flex-1 justify-center py-2 text-sm"
                  onClick={(e) => { e.stopPropagation(); setSelectedTeam(team); }}
                >
                  Open Workspace
                </button>
                <button
                  className="hack-btn-secondary px-3"
                  onClick={(e) => { e.stopPropagation(); toast.success("Settings opened"); }}
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Create New Team */}
        <button
          onClick={() => toast.success("Team creation coming soon!")}
          className="hack-card p-6 flex flex-col items-center justify-center text-center min-h-60 border-dashed hover:border-hack-primary/30 transition-colors"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(124,92,255,0.1)" }}
          >
            <Plus size={24} className="text-hack-primary" />
          </div>
          <div className="text-white font-700 text-base mb-1">Create New Team</div>
          <div className="text-white/40 text-sm">Start a team and invite builders</div>
        </button>
      </div>

      {/* Team Detail Panel */}
      {selectedTeam && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedTeam(null)}
          />
          <TeamDetailPanel team={selectedTeam} onClose={() => setSelectedTeam(null)} />
        </>
      )}
    </div>
  );
}
