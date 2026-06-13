import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Compass, Users, InboxIcon, MessageSquare,
  Bell, User, Building2, Settings, LogOut,
  ChevronRight, Sparkles, Target, PenSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME, APP_TAGLINE } from "@/constants";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { path: "/dashboard",    label: "Dashboard",          icon: LayoutDashboard },
  { path: "/discover",     label: "Discover Hackathons", icon: Compass },
  { path: "/my-teams",     label: "My Teams",           icon: Users },
  { path: "/my-requests",  label: "My Request",         icon: InboxIcon },
  { path: "/messages",     label: "Messages",           icon: MessageSquare, badge: 6 },
  { path: "/notifications",label: "Notifications",      icon: Bell,          badge: 3 },
  { path: "/profile",      label: "My Profile",         icon: User },
];

const QUICK_ACTIONS = [
  { path: "/my-requests",    label: "Create Team Request", icon: Target },
  { path: "/my-teams",       label: "Join a Team",         icon: Users },
  { path: "/ai-team-builder",label: "AI Team Builder",     icon: Sparkles, badge: "New" },
];

export default function Sidebar({ isOpen }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  if (!isOpen) return null;

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-40"
      style={{
        width: "280px",
        background: "var(--hack-sidebar)",
        borderRight: "1px solid var(--hack-divider)",
        transition: "background 0.25s ease, border-color 0.25s ease",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ borderBottom: "1px solid var(--hack-divider)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
        >
          H
        </div>
        <div>
          <div className="font-bold text-base leading-none" style={{ color: "var(--hack-text)" }}>{APP_NAME}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--hack-text-dim)" }}>{APP_TAGLINE}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn("sidebar-nav-item", isActive && "active")}
          >
            <item.icon size={17} />
            <span className="flex-1">{item.label}</span>
            {item.badge && <span className="notification-badge">{item.badge}</span>}
          </NavLink>
        ))}

        {/* Quick Actions */}
        <div className="pt-4 pb-2">
          <div className="px-3 mb-2 text-[11px] font-600 uppercase tracking-widest" style={{ color: "var(--hack-text-dim)" }}>
            Quick Actions
          </div>
          {QUICK_ACTIONS.map((action) => (
            <NavLink
              key={action.path}
              to={action.path}
              className={({ isActive }) => cn("sidebar-nav-item", isActive && "active")}
            >
              <action.icon size={17} />
              <span className="flex-1">{action.label}</span>
              {action.badge && <span className="badge-new">{action.badge}</span>}
            </NavLink>
          ))}
        </div>

        {/* Host Hackathon */}
        <div className="pt-2">
          <NavLink to="/host-hackathon" className="block">
            <div
              className="mx-1 p-4 rounded-2xl cursor-pointer transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, rgba(124,92,255,0.12), rgba(79,124,255,0.08))",
                border: "1px solid rgba(124,92,255,0.18)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={15} style={{ color: "var(--accent-hex, #7C5CFF)" }} />
                    <span className="font-600 text-sm" style={{ color: "var(--hack-text)" }}>Host Hackathon</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--hack-text-dim)" }}>
                    Organize and manage your own hackathon event.
                  </p>
                </div>
                <ChevronRight size={14} style={{ color: "var(--hack-text-dim)" }} className="mt-0.5" />
              </div>
            </div>
          </NavLink>
        </div>
      </nav>

      {/* Profile Strength */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid var(--hack-divider)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-500" style={{ color: "var(--hack-text-dim)" }}>Your Profile Strength</span>
          <button style={{ color: "var(--hack-text-dim)" }} className="hover:opacity-70 transition-opacity">
            <PenSquare size={12} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-700 text-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
          >
            {Math.round(user?.trustScore || 75)}
          </div>
          <div className="flex-1">
            <div className="text-xs font-600" style={{ color: "var(--hack-text)" }}>Almost there!</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--hack-text-dim)" }}>Complete your profile to get better matches.</div>
          </div>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${user?.trustScore || 75}%` }} />
        </div>
        <div className="text-[10px] mt-1.5" style={{ color: "var(--hack-text-dim)" }}>{user?.trustScore || 75}% Complete</div>

        {/* Settings & Logout */}
        <div className="flex gap-2 mt-4">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn("flex items-center gap-2 flex-1 p-2 rounded-xl transition-all text-xs", isActive ? "bg-hack-primary/10" : "hover:bg-white/5")
            }
            style={({ isActive }) => ({ color: isActive ? "var(--accent-hex, #7C5CFF)" : "var(--hack-text-dim)" })}
          >
            <Settings size={13} />
            <span>Settings</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 flex-1 p-2 rounded-xl transition-all text-xs hover:bg-red-500/5"
            style={{ color: "var(--hack-text-dim)" }}
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
