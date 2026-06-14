import { useState, useEffect } from "react";
import {
  Bell, Users, Trophy, User, MessageSquare, AlertTriangle,
  CheckCheck, Trash2, Filter, ArrowRight, ChevronRight
} from "lucide-react";
import { Notification } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const TYPE_CONFIG = {
  team: { icon: Users, color: "#7C5CFF", bg: "rgba(124,92,255,0.12)" },
  hackathon: { icon: Trophy, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  profile: { icon: User, color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  message: { icon: MessageSquare, color: "#4F7CFF", bg: "rgba(79,124,255,0.12)" },
  alert: { icon: AlertTriangle, color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      const formatted = (data || []).map((n: any) => ({
        id: n.id,
        type: n.type || "alert",
        title: n.title || "",
        description: n.description || "",
        timestamp: new Date(n.created_at).toLocaleDateString() + " " + new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: n.read || false,
        actionUrl: n.action_url || undefined,
        actionLabel: n.action_label || undefined,
      }));
      setNotifications(formatted);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    if (!user) return;
    const channel = supabase
      .channel(`page-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filtered = notifications.filter((n) => {
    if (activeFilter === "unread") return !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id);
      if (error) throw error;

      toast.success("All notifications marked as read");
      loadNotifications();
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const markRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;

      loadNotifications();
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;

      toast.success("Notification removed");
      loadNotifications();
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  return (
    <div className="p-6 lg:p-8 pb-20 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-700 text-2xl mb-1">Notifications</h1>
          <p className="text-white/40 text-sm">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="hack-btn-secondary text-sm"
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {[
          { key: "all", label: "All", count: notifications.length },
          { key: "unread", label: "Unread", count: unreadCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as typeof activeFilter)}
            className="px-5 py-2.5 rounded-lg text-sm font-600 transition-all flex items-center gap-2"
            style={{
              background: activeFilter === tab.key ? "#131826" : "transparent",
              color: activeFilter === tab.key ? "white" : "rgba(255,255,255,0.45)",
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-700"
                style={{
                  background: activeFilter === tab.key ? "rgba(124,92,255,0.2)" : "rgba(255,255,255,0.08)",
                  color: activeFilter === tab.key ? "#A78BFF" : "rgba(255,255,255,0.4)",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.map((notif) => {
          const config = TYPE_CONFIG[notif.type];
          return (
            <div
              key={notif.id}
              className="hack-card p-5 flex items-start gap-4 cursor-pointer transition-all"
              style={{
                background: notif.read ? "#131826" : "rgba(124,92,255,0.05)",
                borderColor: notif.read ? "rgba(255,255,255,0.07)" : "rgba(124,92,255,0.15)",
              }}
              onClick={() => markRead(notif.id)}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: config.bg }}
              >
                <config.icon size={18} style={{ color: config.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-white font-600 text-sm mb-0.5">{notif.title}</h3>
                    <p className="text-white/50 text-xs leading-relaxed">{notif.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notif.read && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "#7C5CFF" }}
                      />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                      className="text-white/20 hover:text-white/60 transition-colors p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-white/25 text-[10px]">{notif.timestamp}</span>
                  {notif.actionLabel && (
                    <button
                      className="text-xs font-600 flex items-center gap-1 transition-colors"
                      style={{ color: config.color }}
                    >
                      {notif.actionLabel}
                      <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <Bell size={48} className="mx-auto mb-4 text-white/10" />
          <h3 className="text-white font-600 text-lg mb-2">All caught up!</h3>
          <p className="text-white/40 text-sm">No {activeFilter === "unread" ? "unread " : ""}notifications</p>
        </div>
      )}
    </div>
  );
}
