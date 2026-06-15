import { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import {
  Search, Bell, MessageSquare, Plus, ChevronDown,
  Compass, Users, Settings, LogOut, User, Menu, Zap, Command
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface TopNavProps {
  onToggleSidebar: () => void;
}

export default function TopNav({ onToggleSidebar }: TopNavProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;

    async function loadUnreadCounts() {
      // 1. Notifications
      try {
        const { data: notifs } = await supabase
          .from("notifications")
          .select("is_read")
          .eq("user_id", user.id);
        
        const unreadNotifs = notifs ? notifs.filter((n: any) => !n.is_read).length : 0;
        setUnreadCount(unreadNotifs);
      } catch (e) {
        console.error("Error loading unread notifications:", e);
      }

      // 2. Messages unread count
      try {
        const { data: memberships } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", user.id);
        
        const convIds = (memberships || []).map((m: any) => m.conversation_id);
        if (convIds.length > 0) {
          const { data: msgs } = await supabase
            .from("messages")
            .select("content, sender_id")
            .in("conversation_id", convIds)
            .neq("sender_id", user.id);

          const unreadMsgs = msgs ? msgs.filter((m: any) => !(m.content || "").endsWith("\n\n---SEEN---")).length : 0;
          setUnreadMsgCount(unreadMsgs);
        } else {
          setUnreadMsgCount(0);
        }
      } catch (e) {
        console.error("Error loading unread messages count:", e);
      }
    }
    
    loadUnreadCounts();

    const channelNotif = supabase
      .channel(`topnav-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUnreadCounts();
        }
      )
      .subscribe();

    const channelMsg = supabase
      .channel(`topnav-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelNotif);
      supabase.removeChannel(channelMsg);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 px-6"
      style={{
        height: "64px",
        background: "var(--hack-bg)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--hack-divider)",
        transition: "background 0.25s ease",
      }}
    >
      {/* Toggle Sidebar */}
      <button
        onClick={onToggleSidebar}
        className="transition-colors p-1.5 rounded-lg"
        style={{ color: "var(--hack-text-dim)" }}
      >
        <Menu size={18} />
      </button>

      {/* Global Search */}
      <div className="relative flex-1 max-w-md">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          placeholder="Search hackathons, skills, people, teams..."
          className="hack-input pl-10 pr-14 h-10 text-sm"
          style={{ borderRadius: "12px" }}
        />
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Command size={9} className="text-white/30" />
          <span className="text-white/30 text-[10px]">K</span>
        </div>

        {/* Search Dropdown */}
        {searchFocused && searchQuery && (
          <div
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl p-2 z-50"
            style={{ background: "var(--hack-card)", border: "1px solid var(--hack-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
          >
            <div className="text-white/30 text-xs px-3 py-2">Search results for "{searchQuery}"</div>
            {["AI Innovation Challenge", "Devansh Verma - Developer", "CodeCrafters Team"].map((result) => (
              <div
                key={result}
                className="px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors"
              style={{ color: "var(--hack-text-sub)" }}
              >
                {result}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Nav Links */}
      <nav className="flex items-center gap-1">
        <NavLink
          to="/discover"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-500 transition-all ${
              isActive
                ? "text-hack-primary border-b-2 border-hack-primary bg-hack-primary/10"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`
          }
        >
          <Compass size={15} />
          Hackathons
        </NavLink>
        <NavLink
          to="/my-teams"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-500 transition-all ${
              isActive
                ? "text-hack-primary bg-hack-primary/10"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`
          }
        >
          <Users size={15} />
          Teams
        </NavLink>
        <NavLink
          to="/messages"
          className={({ isActive }) =>
            `relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-500 transition-all ${
              isActive
                ? "text-hack-primary bg-hack-primary/10"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`
          }
        >
          <MessageSquare size={15} />
          Messages
          {unreadMsgCount > 0 && (
            <span className="notification-badge">{unreadMsgCount}</span>
          )}
        </NavLink>
      </nav>

      {/* Notifications */}
      <NavLink
        to="/notifications"
        className="relative p-2 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge absolute -top-1 -right-1">{unreadCount}</span>
        )}
      </NavLink>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 transition-all"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-700 text-sm overflow-hidden"
            style={{ background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || "A"
            )}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-white text-sm font-600 leading-none">{user?.name || "Alex Singh"}</div>
            <div className="text-white/40 text-[11px] mt-0.5">@{user?.email?.split("@")[0] || "alex.dev"}</div>
          </div>
          <ChevronDown size={14} className="text-white/40 hidden md:block" />
        </button>

        {/* Profile Dropdown */}
        {profileOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl p-2 z-50"
              style={{
                background: "var(--hack-card)",
                border: "1px solid var(--hack-border)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
            >
              <div className="px-3 py-2 mb-1">
                <div className="font-600 text-sm" style={{ color: "var(--hack-text)" }}>{user?.name}</div>
                <div className="text-xs" style={{ color: "var(--hack-text-dim)" }}>{user?.email}</div>
              </div>
              <div className="h-px bg-white/5 my-1" />
              {[
                { icon: User, label: "Profile", path: "/profile" },
                { icon: Settings, label: "Settings", path: "/profile" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.path); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm"
                  style={{ color: "var(--hack-text-sub)" }}
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              ))}
              <div className="h-px bg-white/5 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-hack-red/70 hover:text-hack-red hover:bg-hack-red/5 transition-all text-sm"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
