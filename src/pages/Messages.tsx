import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Send, Phone, Video, MoreHorizontal, Paperclip,
  Smile, Pin, Check, CheckCheck, Circle, ArrowLeft, X,
  Users, MessageSquare, Image as ImageIcon, Mic, AtSign,
  ChevronDown, Star
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  sender: "me" | "them";
  senderName?: string;
  senderAvatar?: string;
  text: string;
  time: string;
  date: string;
  status?: "sent" | "delivered" | "seen";
  reactions?: string[];
}

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
  isTeam: boolean;
  avatar?: string;
  icon?: string;
  pinned?: boolean;
  typing?: boolean;
}

const EMOJI_LIST = ["👍", "❤️", "😂", "🔥", "🚀", "💯", "✅", "🎉", "👏", "😮"];

// ─── ConvItem ─────────────────────────────────────────────────────────────────
function ConvItem({
  conv,
  selected,
  onClick,
}: {
  conv: Conversation;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 text-left transition-all rounded-xl mx-1"
      style={{
        background: selected
          ? "rgba(124,92,255,0.12)"
          : "transparent",
        border: selected ? "1px solid rgba(124,92,255,0.2)" : "1px solid transparent",
        width: "calc(100% - 8px)",
      }}
    >
      <div className="relative flex-shrink-0">
        {conv.avatar ? (
          <div className="w-10 h-10 rounded-full overflow-hidden bg-hack-primary/20">
            <img src={conv.avatar} alt={conv.name} className="w-full h-full" />
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: "rgba(124,92,255,0.12)", border: "1px solid rgba(124,92,255,0.15)" }}
          >
            {conv.icon}
          </div>
        )}
        {conv.isOnline && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{ background: "#22C55E", borderColor: "#06070B" }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-${conv.unread > 0 ? "700" : "500"} truncate`} style={{ color: conv.unread > 0 ? "white" : "rgba(255,255,255,0.7)" }}>
              {conv.name}
            </span>
            {conv.pinned && <Pin size={9} className="text-white/25 flex-shrink-0" />}
            {conv.isTeam && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-md font-600" style={{ background: "rgba(79,124,255,0.12)", color: "#7BA5FF" }}>
                Team
              </span>
            )}
          </div>
          <span className="text-white/25 text-[10px] flex-shrink-0 ml-1">{conv.time}</span>
        </div>
        <div className="flex items-center justify-between">
          <span
            className="text-xs truncate flex-1 leading-snug"
            style={{ color: conv.unread > 0 ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.35)" }}
          >
            {conv.typing ? (
              <span className="text-hack-green italic">typing...</span>
            ) : (
              conv.lastMessage
            )}
          </span>
          {conv.unread > 0 && (
            <span
              className="ml-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-700 text-white flex-shrink-0"
              style={{ background: "#7C5CFF" }}
            >
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  isLast,
  showAvatar,
  prevMsg,
}: {
  msg: ChatMessage;
  isLast: boolean;
  showAvatar: boolean;
  prevMsg?: ChatMessage;
}) {
  const isMe = msg.sender === "me";
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<string[]>(msg.reactions || []);

  const addReaction = (emoji: string) => {
    setReactions((prev) =>
      prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji]
    );
    setShowReactions(false);
  };

  return (
    <div
      className={`flex items-end gap-2 group ${isMe ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {!isMe && (
        <div className="w-7 h-7 flex-shrink-0 mb-1">
          {showAvatar && msg.senderAvatar ? (
            <div className="w-7 h-7 rounded-full overflow-hidden bg-hack-primary/20">
              <img src={msg.senderAvatar} alt="" className="w-full h-full" />
            </div>
          ) : null}
        </div>
      )}

      <div className={`flex flex-col gap-0.5 max-w-sm ${isMe ? "items-end" : "items-start"} relative`}>
        {/* Sender name for team chats */}
        {!isMe && showAvatar && msg.senderName && (
          <span className="text-white/35 text-[10px] ml-1 mb-0.5 font-500">{msg.senderName}</span>
        )}

        {/* Bubble */}
        <div className="relative">
          <div
            className="px-4 py-2.5 text-sm leading-relaxed transition-all"
            style={{
              background: isMe
                ? "linear-gradient(135deg, #7C5CFF, #5B43D9)"
                : "rgba(255,255,255,0.07)",
              color: isMe ? "white" : "rgba(255,255,255,0.88)",
              borderRadius: isMe
                ? "18px 18px 4px 18px"
                : "18px 18px 18px 4px",
              boxShadow: isMe
                ? "0 4px 15px rgba(124,92,255,0.3)"
                : "none",
              maxWidth: "340px",
            }}
          >
            {msg.text}
          </div>

          {/* Hover reactions trigger */}
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="absolute opacity-0 group-hover:opacity-100 transition-opacity top-1/2 -translate-y-1/2 p-1 rounded-full"
            style={{
              [isMe ? "left" : "right"]: "-28px",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <Smile size={12} className="text-white/40" />
          </button>

          {/* Emoji picker */}
          {showReactions && (
            <div
              className="absolute z-20 flex gap-1 p-2 rounded-2xl"
              style={{
                [isMe ? "right" : "left"]: "0",
                top: "-44px",
                background: "#131826",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            >
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addReaction(emoji)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-base transition-all hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className={`flex gap-1 flex-wrap ${isMe ? "justify-end" : "justify-start"} ml-1`}>
            {reactions.map((emoji, i) => (
              <button
                key={i}
                onClick={() => addReaction(emoji)}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp + status */}
        <div className={`flex items-center gap-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
          <span className="text-white/20 text-[9px]">{msg.time}</span>
          {isMe && msg.status && (
            <span>
              {msg.status === "seen" ? (
                <CheckCheck size={11} className="text-hack-blue" />
              ) : msg.status === "delivered" ? (
                <CheckCheck size={11} className="text-white/30" />
              ) : (
                <Check size={11} className="text-white/30" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DateDivider ───────────────────────────────────────────────────────────────
function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
      <span
        className="text-[10px] font-500 px-3 py-1 rounded-full"
        style={{ color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)" }}
      >
        {label === "today" ? "Today" : label === "yesterday" ? "Yesterday" : label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-hack-primary/20 flex-shrink-0" />
      <div className="flex flex-col gap-1">
        <div
          className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: "rgba(255,255,255,0.5)", animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span className="text-white/25 text-[9px] ml-1">{name} is typing...</span>
      </div>
    </div>
  );
}

// ─── Main Messages Component ──────────────────────────────────────────────────
export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>({});
  const [messageInput, setMessageInput] = useState("");
  const [search, setSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const currentMessages = selectedId ? (allMessages[selectedId] || []) : [];

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [selectedId]);

  useEffect(() => {
    if (!scrolledUp) scrollToBottom();
  }, [currentMessages, scrolledUp]);

  const loadConversations = async (targetSelectId?: string) => {
    if (!user) return;
    try {
      const { data: myMemberships, error: memberErr } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (memberErr) throw memberErr;

      if (!myMemberships || myMemberships.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = myMemberships.map(m => m.conversation_id);

      const { data: allMemberships, error: allMemErr } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, profiles (id, name, avatar_url, github_avatar, linkedin_avatar)")
        .in("conversation_id", convIds);
      if (allMemErr) throw allMemErr;

      const { data: conversationsMetadata, error: metaErr } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds);
      if (metaErr) throw metaErr;

      const teamIds = conversationsMetadata.map(c => c.team_id).filter(Boolean);
      let teamsMap: Record<string, any> = {};
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from("teams")
          .select("id, name, icon, color, category")
          .in("id", teamIds);
        if (teamsData) {
          teamsData.forEach(t => { teamsMap[t.id] = t; });
        }
      }

      const { data: lastMessagesData } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const lastMessagesMap: Record<string, any> = {};
      if (lastMessagesData) {
        lastMessagesData.forEach(msg => {
          if (!lastMessagesMap[msg.conversation_id]) {
            lastMessagesMap[msg.conversation_id] = msg;
          }
        });
      }

      const convMembersMap: Record<string, any[]> = {};
      allMemberships.forEach(m => {
        if (!convMembersMap[m.conversation_id]) {
          convMembersMap[m.conversation_id] = [];
        }
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        if (profile) convMembersMap[m.conversation_id].push(profile);
      });

      const formattedConvs = conversationsMetadata.map((c: any) => {
        const lastMsg = lastMessagesMap[c.id];
        const members = convMembersMap[c.id] || [];
        const otherMember = members.find(m => m.id !== user.id);

        let name = "Direct Chat";
        let avatar = undefined;
        let icon = "🎯";
        let color = "#7C5CFF";

        if (c.is_team && c.team_id && teamsMap[c.team_id]) {
          const team = teamsMap[c.team_id];
          name = team.name;
          icon = team.icon || "🤖";
          color = team.color || "#7C5CFF";
        } else if (otherMember) {
          name = otherMember.name;
          avatar = otherMember.linkedin_avatar || otherMember.github_avatar || otherMember.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherMember.name}`;
        }

        const lastText = lastMsg
          ? (lastMsg.sender_id === user.id ? `You: ${lastMsg.content}` : lastMsg.content)
          : "No messages yet";

        const lastTime = lastMsg
          ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : "";

        return {
          id: c.id,
          name: name,
          lastMessage: lastText,
          time: lastTime,
          unread: 0,
          isOnline: true,
          isTeam: c.is_team,
          avatar: avatar,
          icon: icon,
          color: color,
          pinned: false,
        };
      });

      setConversations(formattedConvs);

      if (formattedConvs.length > 0) {
        if (targetSelectId) {
          setSelectedId(targetSelectId);
        } else if (!selectedId) {
          setSelectedId(formattedConvs[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesForActiveConversation = async () => {
    if (!selectedId || !user) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles:sender_id (id, name, avatar_url, github_avatar, linkedin_avatar)")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const formatted = (data || []).map((m: any) => {
        const senderProfile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          id: m.id,
          sender: m.sender_id === user.id ? ("me" as const) : ("them" as const),
          senderName: senderProfile?.name || "Builder",
          senderAvatar: senderProfile?.linkedin_avatar || senderProfile?.github_avatar || senderProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderProfile?.name || 'builder'}`,
          text: m.content || "",
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
          status: "seen" as const,
        };
      });

      setAllMessages(prev => ({ ...prev, [selectedId]: formatted }));
    } catch (err) {
      console.error("Error loading messages for active conversation:", err);
    }
  };

  useEffect(() => {
    loadMessagesForActiveConversation();
  }, [selectedId, user]);

  useEffect(() => {
    if (!selectedId || !user) return;

    const channel = supabase
      .channel(`chat-room-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name, avatar_url, github_avatar, linkedin_avatar")
            .eq("id", newMsg.sender_id)
            .single();

          const avatar = profileData?.linkedin_avatar || profileData?.github_avatar || profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData?.name || 'builder'}`;

          const formattedMsg: ChatMessage = {
            id: newMsg.id,
            sender: newMsg.sender_id === user.id ? "me" : "them",
            senderName: profileData?.name || "Builder",
            senderAvatar: avatar,
            text: newMsg.content || "",
            time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(newMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
            status: "seen",
          };

          setAllMessages(prev => {
            const list = prev[selectedId] || [];
            if (list.some(m => m.id === formattedMsg.id)) return prev;
            return { ...prev, [selectedId]: [...list, formattedMsg] };
          });

          setConversations(prev => prev.map(c => {
            if (c.id === selectedId) {
              return {
                ...c,
                lastMessage: newMsg.sender_id === user.id ? `You: ${newMsg.content}` : newMsg.content,
                time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
            }
            return c;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, user]);

  useEffect(() => {
    if (!user) return;

    const searchParams = new URLSearchParams(window.location.search);
    const targetUserId = searchParams.get("user_id");
    const targetTeamId = searchParams.get("team_id");

    async function initializeConversations() {
      if (targetUserId) {
        const { data: userMemberships } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", user.id);

        const convIds = (userMemberships || []).map(m => m.conversation_id);

        let existingConvId = null;
        if (convIds.length > 0) {
          const { data: matches } = await supabase
            .from("conversations")
            .select("id, conversation_members!inner(user_id)")
            .eq("is_team", false)
            .in("id", convIds)
            .eq("conversation_members.user_id", targetUserId);
          
          if (matches && matches.length > 0) {
            existingConvId = matches[0].id;
          }
        }

        if (existingConvId) {
          loadConversations(existingConvId);
        } else {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({ is_team: false })
            .select("id")
            .single();

          if (newConv) {
            await supabase.from("conversation_members").insert([
              { conversation_id: newConv.id, user_id: user.id },
              { conversation_id: newConv.id, user_id: targetUserId }
            ]);
            loadConversations(newConv.id);
          }
        }
      } else if (targetTeamId) {
        const { data: matches } = await supabase
          .from("conversations")
          .select("id")
          .eq("is_team", true)
          .eq("team_id", targetTeamId)
          .maybeSingle();

        if (matches) {
          loadConversations(matches.id);
        } else {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({ is_team: true, team_id: targetTeamId })
            .select("id")
            .single();

          if (newConv) {
            const { data: teamMems } = await supabase
              .from("team_members")
              .select("user_id")
              .eq("team_id", targetTeamId);
            
            const insertRows = (teamMems || []).map(m => ({
              conversation_id: newConv.id,
              user_id: m.user_id
            }));
            if (!insertRows.some(r => r.user_id === user.id)) {
              insertRows.push({ conversation_id: newConv.id, user_id: user.id });
            }

            if (insertRows.length > 0) {
              await supabase.from("conversation_members").insert(insertRows);
            }
            loadConversations(newConv.id);
          }
        }
      } else {
        loadConversations();
      }
    }

    initializeConversations();
  }, [user]);

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setShowMobileChat(true);
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedId || !user) return;

    const content = messageInput.trim();
    setMessageInput("");
    setShowEmoji(false);
    inputRef.current?.focus();

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedId,
          sender_id: user.id,
          content: content
        });
      if (error) throw error;
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    setScrolledUp(scrollHeight - scrollTop - clientHeight > 200);
  };

  const filteredConvs = conversations.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedConvs = filteredConvs.filter((c) => c.pinned);
  const regularConvs = filteredConvs.filter((c) => !c.pinned);

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  currentMessages.forEach((msg) => {
    const last = groupedMessages[groupedMessages.length - 1];
    if (!last || last.date !== msg.date) {
      groupedMessages.push({ date: msg.date, messages: [msg] });
    } else {
      last.messages.push(msg);
    }
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div
      className="flex"
      style={{ height: "calc(100vh - 64px)", overflow: "hidden" }}
    >
      {/* ── CONVERSATION LIST ── */}
      <div
        className={`flex flex-col flex-shrink-0 ${showMobileChat ? "hidden lg:flex" : "flex"}`}
        style={{
          width: "288px",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "#0A0C14",
        }}
      >
        {/* Header */}
        <div
          className="px-4 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-hack-primary" />
              <h2 className="text-white font-700 text-base">Messages</h2>
              {totalUnread > 0 && (
                <span className="notification-badge">{totalUnread}</span>
              )}
            </div>
            <button
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="hack-input pl-8 py-2 text-xs"
              style={{ borderRadius: "10px" }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {pinnedConvs.length > 0 && (
            <>
              <div className="px-4 py-1.5">
                <span className="text-[9px] uppercase tracking-widest font-700 text-white/20 flex items-center gap-1.5">
                  <Pin size={9} /> Pinned
                </span>
              </div>
              {pinnedConvs.map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  selected={selectedId === conv.id}
                  onClick={() => selectConversation(conv.id)}
                />
              ))}
              <div className="mx-4 my-2 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
            </>
          )}

          {regularConvs.length > 0 && (
            <>
              <div className="px-4 py-1.5">
                <span className="text-[9px] uppercase tracking-widest font-700 text-white/20">
                  All Messages
                </span>
              </div>
              {regularConvs.map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  selected={selectedId === conv.id}
                  onClick={() => selectConversation(conv.id)}
                />
              ))}
            </>
          )}

          {filteredConvs.length === 0 && (
            <div className="text-center py-10 text-white/25 text-sm">No conversations found</div>
          )}
        </div>
      </div>

      {/* ── CHAT WINDOW ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${showMobileChat ? "flex" : "hidden lg:flex"}`}
        style={{ background: "#06070B" }}
      >
        {/* Chat Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(6,7,11,0.9)", backdropFilter: "blur(10px)" }}
        >
          <div className="flex items-center gap-3">
            {/* Back on mobile */}
            <button
              onClick={() => setShowMobileChat(false)}
              className="lg:hidden text-white/40 hover:text-white/70 p-1 mr-1"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="relative">
              {selectedConv?.avatar ? (
                <div className="w-9 h-9 rounded-full overflow-hidden bg-hack-primary/20">
                  <img src={selectedConv.avatar} alt="" className="w-full h-full" />
                </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{ background: "rgba(124,92,255,0.12)" }}
                >
                  {selectedConv?.icon}
                </div>
              )}
              {selectedConv?.isOnline && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{ background: "#22C55E", borderColor: "#06070B" }}
                />
              )}
            </div>

            <div>
              <div className="text-white font-700 text-sm">{selectedConv?.name}</div>
              <div className="text-white/35 text-xs flex items-center gap-1">
                {isTyping ? (
                  <span className="text-hack-green">typing...</span>
                ) : (
                  <>
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: selectedConv?.isOnline ? "#22C55E" : "rgba(255,255,255,0.2)" }}
                    />
                    {selectedConv?.isOnline ? "Online" : "Offline"}
                    {selectedConv?.isTeam && " · Team Chat"}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button className="p-2 rounded-xl text-white/30 hover:text-white/65 hover:bg-white/5 transition-all">
              <Phone size={15} />
            </button>
            <button className="p-2 rounded-xl text-white/30 hover:text-white/65 hover:bg-white/5 transition-all">
              <Video size={15} />
            </button>
            <button className="p-2 rounded-xl text-white/30 hover:text-white/65 hover:bg-white/5 transition-all">
              <Search size={15} />
            </button>
            <button className="p-2 rounded-xl text-white/30 hover:text-white/65 hover:bg-white/5 transition-all">
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-5 space-y-3"
          style={{ scrollbarWidth: "thin" }}
        >
          {groupedMessages.map(({ date, messages }) => (
            <div key={date}>
              <DateDivider label={date} />
              <div className="space-y-2">
                {messages.map((msg, idx) => {
                  const prevMsg = messages[idx - 1];
                  const showAvatar = !prevMsg || prevMsg.sender !== msg.sender;
                  const isLast = idx === messages.length - 1;
                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isLast={isLast}
                      showAvatar={showAvatar}
                      prevMsg={prevMsg}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {isTyping && (
            <TypingIndicator name={selectedConv?.name || "Someone"} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {scrolledUp && (
          <div className="relative">
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all hover:scale-110"
              style={{ background: "#7C5CFF", boxShadow: "0 4px 15px rgba(124,92,255,0.4)" }}
            >
              <ChevronDown size={16} className="text-white" />
            </button>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmoji && (
          <div
            className="mx-5 p-3 rounded-2xl flex flex-wrap gap-1"
            style={{
              background: "#131826",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              borderRadius: "16px 16px 0 0",
            }}
          >
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setMessageInput((prev) => prev + emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-all hover:scale-125"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowEmoji(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/30 transition-all ml-auto"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input Area */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
            style={{
              background: "#0E111B",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
              title="Attach file"
            >
              <Paperclip size={16} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${selectedConv?.name || ""}...`}
              className="flex-1 bg-transparent text-sm text-white/85 placeholder-white/25 outline-none min-w-0"
            />

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5"
                title="Emoji"
              >
                <Smile size={16} />
              </button>
              <button
                onClick={handleSend}
                disabled={!messageInput.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: messageInput.trim()
                    ? "linear-gradient(135deg, #7C5CFF, #5B43D9)"
                    : "rgba(255,255,255,0.06)",
                  boxShadow: messageInput.trim() ? "0 0 12px rgba(124,92,255,0.3)" : "none",
                }}
              >
                <Send
                  size={13}
                  className="transition-colors"
                  style={{ color: messageInput.trim() ? "white" : "rgba(255,255,255,0.2)" }}
                />
              </button>
            </div>
          </div>

          {/* Shortcuts hint */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="text-white/15 text-[10px]">Enter to send · Shift+Enter new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
