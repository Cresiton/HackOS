import { useState, useEffect } from "react";
import { useNavigate, NavLink, useSearchParams, useLocation } from "react-router-dom";
import {
  Search, Bell, MessageSquare, Plus, ChevronDown,
  Compass, Users, Settings, LogOut, User, Menu, Zap, Command
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface SearchResult {
  id: string;
  type: 'hackathon' | 'team' | 'user' | 'team_request' | 'message' | 'organizer';
  title: string;
  subtitle: string;
  url: string;
  icon: any;
}

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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync with URL when navigating
  useEffect(() => {
    if (location.pathname === "/search") {
      setSearchQuery(searchParams.get("q") || "");
    } else {
      setSearchQuery("");
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    async function performSearch() {
      setIsSearching(true);
      const q = `%${debouncedQuery}%`;
      const results: SearchResult[] = [];

      try {
        const [
          { data: hackathons },
          { data: profiles },
          { data: skillsData },
          { data: teams },
          { data: teamRequests },
          { data: messages }
        ] = await Promise.all([
          supabase.from("hackathons").select("id, title, mode, description").or(`title.ilike.${q},description.ilike.${q}`).limit(4),
          supabase.from("profiles").select("id, name, role, bio").or(`name.ilike.${q},role.ilike.${q},bio.ilike.${q}`).limit(4),
          supabase.from("user_skills").select("user_id, skills!inner(name)").ilike("skills.name", q).limit(10),
          supabase.from("teams").select("id, name, category, status, description").or(`name.ilike.${q},description.ilike.${q},category.ilike.${q}`).limit(4),
          supabase.from("team_requests").select("id, role, message, team_id, teams(name)").or(`role.ilike.${q},message.ilike.${q}`).limit(4),
          (async () => {
            if (!user) return { data: null };
            const { data: convs } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", user.id);
            const convIds = (convs || []).map((c: any) => c.conversation_id);
            if (convIds.length === 0) return { data: [] };
            return supabase.from("messages").select("id, content, conversation_id").in("conversation_id", convIds).ilike("content", q).limit(4);
          })()
        ]);

        // Process Hackathons
        if (hackathons) {
          hackathons.forEach((h: any) => {
            results.push({
              id: `h-${h.id}`,
              type: 'hackathon',
              title: h.title,
              subtitle: `Hackathon • ${h.mode || 'Online'}`,
              url: `/hackathon/${h.id}`,
              icon: Compass
            });
          });
        }

        // Process Profiles & Skills
        const profileMap = new Map();
        if (profiles) {
          profiles.forEach((p: any) => profileMap.set(p.id, p));
        }
        
        // Fetch profiles for users matched by skills but not already in the profile results
        if (skillsData && skillsData.length > 0) {
          const missingIds = skillsData.map((s: any) => s.user_id).filter((id: string) => !profileMap.has(id));
          if (missingIds.length > 0) {
            const { data: extraProfiles } = await supabase.from("profiles").select("id, name, role, bio").in("id", missingIds).limit(4);
            if (extraProfiles) {
              extraProfiles.forEach((p: any) => profileMap.set(p.id, p));
            }
          }
        }

        Array.from(profileMap.values()).slice(0, 5).forEach((p: any) => {
          const isOrg = p.role?.toLowerCase().includes('organizer');
          results.push({
            id: `p-${p.id}`,
            type: isOrg ? 'organizer' : 'user',
            title: p.name,
            subtitle: p.role || 'Developer',
            url: `/profile/${p.id}`,
            icon: User
          });
        });

        // Process Teams
        if (teams) {
          teams.forEach((t: any) => {
            const isReq = t.status === 'recruiting';
            results.push({
              id: `t-${t.id}`,
              type: isReq ? 'team_request' : 'team',
              title: t.name,
              subtitle: isReq ? `Looking for members • ${t.category}` : `Team • ${t.category}`,
              url: `/my-teams`,
              icon: Users
            });
          });
        }

        // Process Team Requests
        if (teamRequests) {
          teamRequests.forEach((tr: any) => {
            const teamName = tr.teams?.name || 'A team';
            results.push({
              id: `tr-${tr.id}`,
              type: 'team_request',
              title: `Request for ${teamName}`,
              subtitle: tr.role ? `Role: ${tr.role}` : 'Team Request',
              url: `/requests`,
              icon: Plus
            });
          });
        }

        // Process Messages
        if (messages?.data) {
          messages.data.forEach((m: any) => {
            results.push({
              id: `m-${m.id}`,
              type: 'message',
              title: m.content.length > 40 ? m.content.substring(0, 40) + '...' : m.content,
              subtitle: 'Message',
              url: `/messages`,
              icon: MessageSquare
            });
          });
        }

        setSearchResults(results);
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedQuery, user]);

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
        <form onSubmit={(e) => {
          e.preventDefault();
          if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
            setSearchFocused(false);
          }
        }}>
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
            className="hack-input pl-10 pr-14 h-10 text-sm w-full"
            style={{ borderRadius: "12px" }}
          />
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Command size={9} className="text-white/30" />
            <span className="text-white/30 text-[10px]">K</span>
          </div>
        </form>

        {/* Search Dropdown */}
        {searchFocused && searchQuery && (
          <div
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl p-2 z-50 max-h-96 overflow-y-auto"
            style={{ background: "var(--hack-card)", border: "1px solid var(--hack-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
          >
            <div className="text-white/30 text-xs px-3 py-2">
              {isSearching ? "Searching..." : `Search results for "${searchQuery}"`}
            </div>
            
            {!isSearching && searchResults.length === 0 && (
              <div className="px-3 py-4 text-center text-sm" style={{ color: "var(--hack-text-sub)" }}>
                No results found.
              </div>
            )}

            {!isSearching && searchResults.length > 0 && searchResults.map((result) => (
              <div
                key={result.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigate(result.url);
                  setSearchFocused(false);
                  setSearchQuery("");
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/5 group"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/50 group-hover:bg-hack-primary/20 group-hover:text-hack-primary transition-colors">
                  <result.icon size={14} />
                </div>
                <div className="flex-1 min-w-0 flex justify-between items-center">
                  <div className="min-w-0 overflow-hidden pr-2">
                    <div className="text-sm font-500 truncate" style={{ color: "var(--hack-text)" }}>{result.title}</div>
                    <div className="text-xs truncate" style={{ color: "var(--hack-text-dim)" }}>{result.subtitle}</div>
                  </div>
                  <div className="text-[10px] uppercase font-600 px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    {result.type.replace('_', ' ')}
                  </div>
                </div>
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
