import { useState, useEffect } from "react";
import HackathonRegistrationModal from "@/components/features/HackathonRegistrationModal";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, Bookmark, Share2, Clock, Users,
  Trophy, Grid, List, Calendar
} from "lucide-react";
import { Hackathon } from "@/types";
import { supabase } from "@/lib/supabase";
import { deserializeHackathon } from "@/lib/utils";

const FILTERS = {
  mode: ["All", "Online", "Offline", "Hybrid"],
  difficulty: ["All", "Beginner", "Intermediate", "Advanced"],
  prize: ["All", "Under ₹50K", "₹50K-₹1L", "₹1L-₹5L", "₹5L+"],
};

function HackathonCard({ hack }: { hack: Hackathon }) {
  const [bookmarked, setBookmarked] = useState(false);
  const navigate = useNavigate();

  return (
    <Link to={`/hackathon/${hack.id}`} className="block">
      <div className="hack-card overflow-hidden group">
        <div className="relative">
          <img src={hack.image} alt={hack.title} className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2 flex-wrap items-center">
            {hack.featured && <span className="featured-tag">Featured</span>}
            <span className={`tag ${hack.mode === "Online" ? "online-tag" : hack.mode === "Offline" ? "offline-tag" : ""}`}>
              {hack.mode}
            </span>
            <span className="text-xs font-500 px-2.5 py-1 rounded-lg bg-hack-primary/20 text-[#A78BFF] border border-hack-primary/30">
              {hack.category || "General"}
            </span>
          </div>

          {/* Actions */}
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.preventDefault(); setBookmarked(!bookmarked); }}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{ background: bookmarked ? "rgba(124,92,255,0.3)" : "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <Bookmark size={14} style={{ color: bookmarked ? "#7C5CFF" : "white", fill: bookmarked ? "#7C5CFF" : "none" }} />
            </button>
            <button
              onClick={(e) => e.preventDefault()}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <Share2 size={14} className="text-white" />
            </button>
          </div>

          {/* Difficulty badge */}
          {hack.difficulty && (
            <div className="absolute bottom-3 left-3">
              <span
                className="text-xs font-500 px-2.5 py-1 rounded-lg"
                style={{
                  background: hack.difficulty === "Beginner" ? "rgba(34,197,94,0.2)" : hack.difficulty === "Intermediate" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
                  color: hack.difficulty === "Beginner" ? "#22C55E" : hack.difficulty === "Intermediate" ? "#F59E0B" : "#EF4444",
                  border: `1px solid ${hack.difficulty === "Beginner" ? "rgba(34,197,94,0.3)" : hack.difficulty === "Intermediate" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}
              >
                {hack.difficulty}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-3">
          <div>
            <h3 className="text-white font-700 text-base leading-snug flex-1 pr-2">{hack.title}</h3>
            <span className="text-white/40 text-xs">by {hack.organizer}</span>
          </div>

          <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{hack.description}</p>

          <div className="grid grid-cols-2 gap-2 text-white/50 text-xs bg-white/2 p-2.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-1.5">
              <Users size={12} className="text-hack-primary" />
              <span>Size: {hack.teamSize || "2-4"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-hack-orange" />
              <span className="truncate">Deadline: {hack.registrationDeadline}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {hack.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>

          <div
            className="flex items-center justify-between pt-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div>
              <div className="text-hack-primary font-700 text-base">{hack.prize}</div>
              <div className="text-white/30 text-[10px]">Prize Pool</div>
            </div>
            <div className="text-right">
              <div className="days-left justify-end">
                <Clock size={11} />
                {hack.daysLeft} Days Left
              </div>
              <div className="text-white/30 text-[10px] mt-0.5">{hack.participants}+ participants</div>
            </div>
          </div>

          <button
            className="hack-btn-primary w-full justify-center py-2.5"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/register-hackathon/${hack.id}`);
            }}
          >
            Register
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function DiscoverHackathons() {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("All Hackathons");

  const [dbHackathons, setDbHackathons] = useState<Hackathon[]>([]);

  useEffect(() => {
    async function loadHackathons() {
      try {
        const { data, error } = await supabase
          .from("hackathons")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) {
          setDbHackathons(data.map(deserializeHackathon));
        }
      } catch (err) {
        console.error("Error loading hackathons from Supabase:", err);
      }
    }
    loadHackathons();
  }, []);

  const filtered = dbHackathons.filter((h) => {
    const matchSearch = !search ||
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchMode = modeFilter === "All" || h.mode === modeFilter;
    const matchDiff = difficultyFilter === "All" || h.difficulty === difficultyFilter;
    const matchCat = selectedCategory === "All Hackathons" || h.category === selectedCategory;
    return matchSearch && matchMode && matchDiff && matchCat;
  });

  return (
    <div className="p-6 lg:p-8 pb-20">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-white font-700 text-2xl mb-1">Discover Hackathons</h1>
          <p className="text-white/40 text-sm">Find your next competition from 850+ active hackathons</p>
        </div>
        <Link to="/match">
          <button className="hack-btn-primary py-2.5 px-5" style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", borderColor: "#15803D" }}>
            <Users size={16} />
            Match with Participants
          </button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 min-w-60">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hackathons, themes, tags..."
            className="hack-input pl-10"
          />
        </div>

        {Object.entries(FILTERS).map(([key, options]) => (
          <select
            key={key}
            className="hack-input py-3 w-auto px-4 text-sm cursor-pointer"
            style={{ borderRadius: "14px" }}
            onChange={(e) => {
              if (key === "mode") setModeFilter(e.target.value);
              if (key === "difficulty") setDifficultyFilter(e.target.value);
            }}
          >
            {options.map((opt) => (
              <option key={opt} value={opt} style={{ background: "#131826" }}>{opt}</option>
            ))}
          </select>
        ))}

        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 rounded-xl transition-all ${viewMode === "grid" ? "bg-hack-primary/20 text-hack-primary" : "text-white/30 hover:text-white/60 hover:bg-white/5"}`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 rounded-xl transition-all ${viewMode === "list" ? "bg-hack-primary/20 text-hack-primary" : "text-white/30 hover:text-white/60 hover:bg-white/5"}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {["All Hackathons", "AI & ML", "Web Dev", "Mobile", "Blockchain", "Sustainability", "HealthTech", "FinTech"].map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-4 py-2 rounded-xl text-sm font-500 whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: isActive ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.04)",
                color: isActive ? "#A78BFF" : "rgba(255,255,255,0.45)",
                border: `1px solid ${isActive ? "rgba(124,92,255,0.25)" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-white/40 text-sm">
          Showing <span className="text-white font-600">{filtered.length}</span> hackathons
        </p>
        <select
          className="hack-input py-2 px-3 w-auto text-xs"
          style={{ borderRadius: "10px" }}
        >
          <option style={{ background: "#131826" }}>Sort: Most Recent</option>
          <option style={{ background: "#131826" }}>Sort: Prize Pool</option>
          <option style={{ background: "#131826" }}>Sort: Deadline</option>
          <option style={{ background: "#131826" }}>Sort: Participants</option>
        </select>
      </div>

      {/* Grid */}
      <div className={`grid gap-5 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
        {filtered.map((hack) => (
          <HackathonCard
            key={hack.id}
            hack={hack}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-white font-600 text-lg mb-2">No hackathons found</h3>
          <p className="text-white/40 text-sm">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}
