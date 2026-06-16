import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Teammate, Hackathon, Team, UserProject } from "@/types";
import { searchAndRank, SearchItem, OrganizationItem } from "@/lib/searchRankingEngine";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import {
  MapPin, Search, Filter, SlidersHorizontal, Users, Calendar, Award,
  Terminal, ExternalLink, Sparkles, Star, CheckCircle, GraduationCap,
  Building, ChevronRight, X, ArrowRight, Loader2, RefreshCw
} from "lucide-react";

export default function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  // Core Search State
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"all" | "recommended" | "priority">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "user" | "team" | "project" | "hackathon" | "organization">("all");

  // Autocomplete Suggestions Hook
  const { suggestions, aiAnalysis, isAiLoading } = useSearchSuggestions(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Db Raw Data State
  const [dbProfiles, setDbProfiles] = useState<Teammate[]>([]);
  const [dbTeams, setDbTeams] = useState<Team[]>([]);
  const [dbProjects, setDbProjects] = useState<UserProject[]>([]);
  const [dbHackathons, setDbHackathons] = useState<Hackathon[]>([]);
  const [dbOrganizations, setDbOrganizations] = useState<OrganizationItem[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Advanced Filters State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>("All Domains");
  const [filterSkill, setFilterSkill] = useState<string>("All Skills");
  const [filterExperience, setFilterExperience] = useState<string>("All Levels");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterAvailability, setFilterAvailability] = useState<string>("All");
  const [filterMinTeamSize, setFilterMinTeamSize] = useState<number>(0);
  const [filterMinTrustScore, setFilterMinTrustScore] = useState<number>(0);
  const [filterHackathonCategory, setFilterHackathonCategory] = useState<string>("All Categories");

  // Close suggestions dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync state query when URL search param change
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchQuery(q);
  }, [searchParams]);

  // Load all DB resources once on mount
  useEffect(() => {
    async function loadResources() {
      setIsLoading(true);
      try {
        const [
          { data: profiles },
          { data: skillsData },
          { data: teamsData },
          { data: projectsData },
          { data: hackathonsData },
          { data: regData }
        ] = await Promise.all([
          supabase.from("profiles").select("*").limit(150),
          supabase.from("user_skills").select("user_id, skills (name)"),
          supabase.from("teams").select("*").limit(100),
          supabase.from("user_projects").select("*").limit(150),
          supabase.from("hackathons").select("*").limit(80),
          user ? supabase.from("registrations").select("hackathon_id").eq("user_id", user.id) : Promise.resolve({ data: [] })
        ]);

        // 1. Process Skills Map
        const userSkillsMap: Record<string, string[]> = {};
        if (skillsData) {
          skillsData.forEach((row: any) => {
            const skillName = row.skills?.name;
            if (skillName && row.user_id) {
              if (!userSkillsMap[row.user_id]) userSkillsMap[row.user_id] = [];
              userSkillsMap[row.user_id].push(skillName);
            }
          });
        }

        // 2. Process Profiles
        const formattedTeammates = (profiles || []).map((p: any) => {
          const skills = userSkillsMap[p.id] || [];
          return {
            id: p.id,
            name: p.name,
            role: p.role || "Full Stack Developer",
            location: p.location || "Online",
            latitude: p.latitude,
            longitude: p.longitude,
            skills: skills,
            rating: Number(p.rating) || 5.0,
            isOnline: false,
            avatar: p.linkedin_avatar || p.github_avatar || p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
            college: p.college || "",
            trustScore: p.trust_score || 25,
            availability: p.availability || "available",
            github_connected: !!p.github_connected,
            github_username: p.github_username,
            experience: p.experience || ""
          };
        });
        setDbProfiles(formattedTeammates);

        // 3. Process Teams
        const formattedTeams = (teamsData || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          hackathon: "Hackathon Challenge",
          members: [],
          maxMembers: t.max_members || 4,
          progress: t.progress || 0,
          status: t.status || "recruiting",
          requiredRoles: Array.isArray(t.required_roles) 
            ? t.required_roles.map((r: any) => r.role || String(r)) 
            : (t.required_roles ? [String(t.required_roles)] : []),
          description: t.description || "",
          category: t.category || "General",
          color: t.color || "#7C5CFF",
          icon: t.icon || "🚀"
        }));
        setDbTeams(formattedTeams);

        // 4. Process Projects
        setDbProjects(projectsData || []);

        // 5. Process Hackathons
        const formattedHackathons = (hackathonsData || []).map((h: any) => ({
          id: h.id,
          title: h.title,
          organizer: h.organizer || "Community",
          description: h.description || "",
          image: h.image || "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
          mode: h.mode || "Online",
          prize: h.prize || "$5,000",
          prizeAmount: Number(h.prize_amount) || 5000,
          tags: Array.isArray(h.tags) ? h.tags : (h.tags ? [h.tags] : ["Code", "Build"]),
          daysLeft: h.days_left || 7,
          participants: h.participants || 120,
          startDate: h.start_date || "",
          endDate: h.end_date || "",
          registrationDeadline: h.registration_deadline || "",
          status: h.status || "open",
          category: h.category || "General"
        }));
        setDbHackathons(formattedHackathons);

        // 6. Process Registrations
        if (regData) {
          setUserRegistrations(regData.map((r: any) => r.hackathon_id));
        }

        // 7. Aggregate Organizations (Virtual)
        const orgMap = new Map<string, { hackCount: number; userCount: number; type: string; skills: Set<string> }>();
        
        // Add organizers
        formattedHackathons.forEach(h => {
          if (!h.organizer) return;
          const key = h.organizer.trim();
          if (!orgMap.has(key)) {
            orgMap.set(key, { hackCount: 0, userCount: 0, type: "Sponsor/Organizer", skills: new Set(h.tags) });
          }
          const existing = orgMap.get(key)!;
          existing.hackCount += 1;
          h.tags.forEach(t => existing.skills.add(t));
        });

        // Add colleges
        formattedTeammates.forEach(p => {
          if (!p.college) return;
          const key = p.college.trim();
          if (!orgMap.has(key)) {
            orgMap.set(key, { hackCount: 0, userCount: 0, type: "Academic Institution", skills: new Set(p.skills) });
          }
          const existing = orgMap.get(key)!;
          existing.userCount += 1;
          p.skills.forEach(s => existing.skills.add(s));
        });

        const orgList: OrganizationItem[] = Array.from(orgMap.entries()).map(([name, data]) => ({
          id: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          name: name,
          type: data.type as any,
          hackathonsCount: data.hackCount,
          usersCount: data.userCount,
          description: data.type === "Academic Institution" 
            ? `Active learning hub collaborating with HackOS builders.` 
            : `Sponsor and organizer facilitating high-tier innovation hackathons.`,
          skills: Array.from(data.skills).slice(0, 5)
        }));
        setDbOrganizations(orgList);

      } catch (err) {
        console.error("Failed to load search resources:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadResources();
  }, [user]);

  // 1. Process Semantic Matching and Ranking
  const rankedItems = useMemo(() => {
    const finalAnalysis = aiAnalysis || {
      expandedKeywords: [],
      preferredRoles: [],
      preferredSkills: [],
      domains: [],
      isAiFocused: false,
      isCybersecurityFocused: false,
      isFlutterFocused: false,
      strictExclusions: [],
      intentDescription: "",
      aiSuggestions: []
    };

    return searchAndRank(
      searchQuery,
      finalAnalysis,
      user,
      userRegistrations,
      dbProfiles,
      dbTeams,
      dbProjects,
      dbHackathons,
      dbOrganizations
    );
  }, [searchQuery, aiAnalysis, user, userRegistrations, dbProfiles, dbTeams, dbProjects, dbHackathons, dbOrganizations]);

  // 2. Aggregate distinct skills and domains for advanced filters
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    dbProfiles.forEach(p => p.skills.forEach(s => skills.add(s)));
    return Array.from(skills).sort();
  }, [dbProfiles]);

  // 3. Client Side Instant Filtering (Runs on top of semantic ranking results)
  const filteredItems = useMemo(() => {
    return rankedItems.filter(item => {
      // Category filter badge
      if (categoryFilter !== "all" && item.type !== categoryFilter) return false;

      // Domain Filter
      if (filterDomain !== "All Domains") {
        const domainKeywords: Record<string, string[]> = {
          "AI/ML": ["ai", "ml", "machine learning", "deep learning", "nlp", "vision", "tensorflow", "pytorch", "data science"],
          "Web Development": ["web", "react", "next.js", "frontend", "backend", "fullstack", "node", "typescript", "javascript", "html", "css"],
          "Mobile Development": ["mobile", "flutter", "react native", "android", "ios", "swift", "kotlin", "dart"],
          "Cybersecurity": ["cyber", "security", "pentest", "hacking", "crypto", "auth"],
          "Blockchain/Web3": ["blockchain", "solidity", "web3", "ethereum", "smart contract", "rust"]
        };
        const keywords = domainKeywords[filterDomain] || [];
        const matchesDomain = keywords.some(kw => 
          item.title.toLowerCase().includes(kw) || 
          item.subtitle.toLowerCase().includes(kw) || 
          item.description.toLowerCase().includes(kw) ||
          item.tags.some(t => t.toLowerCase().includes(kw))
        );
        if (!matchesDomain) return false;
      }

      // Skills Filter
      if (filterSkill !== "All Skills") {
        const matchesSkill = item.tags.some(t => t.toLowerCase() === filterSkill.toLowerCase()) || 
          item.description.toLowerCase().includes(filterSkill.toLowerCase());
        if (!matchesSkill) return false;
      }

      // Experience Level Filter
      if (filterExperience !== "All Levels") {
        if (item.type === "user") {
          const uExp = (item.originalData as Teammate).experience || "";
          if (filterExperience === "Beginner" && !uExp.includes("First") && !uExp.includes("1-2")) return false;
          if (filterExperience === "Intermediate" && !uExp.includes("1-2") && !uExp.includes("3-5")) return false;
          if (filterExperience === "Advanced" && !uExp.includes("6+") && !uExp.includes("3-5")) return false;
        } else {
          // Keep other item types or filter them out if strictly looking for experience
        }
      }

      // Location Filter
      if (filterLocation.trim()) {
        const loc = filterLocation.toLowerCase();
        const matchesLoc = item.description.toLowerCase().includes(loc) || 
          (item.type === "user" && (item.originalData as Teammate).location.toLowerCase().includes(loc));
        if (!matchesLoc) return false;
      }

      // Availability Filter
      if (filterAvailability !== "All" && item.type === "user") {
        const avail = (item.originalData as Teammate).availability;
        if (avail !== filterAvailability) return false;
      }

      // Team Size Filter
      if (filterMinTeamSize > 0) {
        if (item.type === "team" && (item.originalData as Team).maxMembers < filterMinTeamSize) return false;
        if (item.type === "hackathon" && (item.originalData as Hackathon).team_size_max && (item.originalData as Hackathon).team_size_max! < filterMinTeamSize) return false;
      }

      // Trust Score Filter
      if (filterMinTrustScore > 0) {
        if (item.type === "user" && (item.originalData as Teammate).trustScore < filterMinTrustScore) return false;
      }

      // Hackathon Category Filter
      if (filterHackathonCategory !== "All Categories") {
        if (item.type === "hackathon") {
          const hCat = (item.originalData as Hackathon).category || "";
          if (!hCat.toLowerCase().includes(filterHackathonCategory.toLowerCase()) && !item.tags.some(t => t.toLowerCase().includes(filterHackathonCategory.toLowerCase()))) return false;
        } else if (item.type === "team") {
          const tCat = (item.originalData as Team).category || "";
          if (!tCat.toLowerCase().includes(filterHackathonCategory.toLowerCase())) return false;
        }
      }

      return true;
    });
  }, [rankedItems, categoryFilter, filterDomain, filterSkill, filterExperience, filterLocation, filterAvailability, filterMinTeamSize, filterMinTrustScore, filterHackathonCategory]);

  // Tab Filtering logic
  const tabItems = useMemo(() => {
    if (activeTab === "all") {
      return filteredItems;
    } else if (activeTab === "recommended") {
      // Show highly compatible matches (> 65% score)
      return filteredItems
        .filter(item => item.compatibilityScore >= 65)
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    } else {
      // Priority Matches: highest compatibility matches first (> 75%)
      return filteredItems
        .filter(item => item.compatibilityScore >= 75)
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    }
  }, [filteredItems, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (val: string) => {
    setSearchQuery(val);
    setSearchParams({ q: val });
    setShowSuggestions(false);
  };

  const clearAllFilters = () => {
    setFilterDomain("All Domains");
    setFilterSkill("All Skills");
    setFilterExperience("All Levels");
    setFilterLocation("");
    setFilterAvailability("All");
    setFilterMinTeamSize(0);
    setFilterMinTrustScore(0);
    setFilterHackathonCategory("All Categories");
  };

  // Compatibility Ring Renderer
  const MatchScoreRing = ({ score }: { score: number }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = score >= 85 ? "#22C55E" : score >= 70 ? "#4F7CFF" : "#F59E0B";

    return (
      <div className="relative flex items-center justify-center w-12 h-12">
        <svg width="44" height="44" className="-rotate-90">
          <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-[10px] font-800 text-white">
          {score}%
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-hack-bg pb-24">
      <main className="pt-8 px-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header Title and Search bar area */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h1 className="text-white font-800 text-3xl tracking-tight flex items-center gap-2">
              <Sparkles className="text-hack-primary" size={28} />
              AI Intelligent Search
            </h1>
            {searchQuery && (
              <p className="text-white/45 text-sm">
                Showing semantic matches for <span className="text-hack-primary font-700">"{searchQuery}"</span>
                {aiAnalysis?.intentDescription && (
                  <span className="italic block mt-1 text-white/30 text-xs">AI Intent: {aiAnalysis.intentDescription}</span>
                )}
              </p>
            )}
          </div>

          {/* Search Box with Autocomplete */}
          <div className="relative w-full lg:max-w-xl" ref={suggestionRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-4 text-white/30" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search by role, technology, skill, hackathon..."
                className="hack-input pl-12 pr-20 py-3.5 text-sm w-full font-500 shadow-2xl transition-all"
                style={{ borderRadius: "16px" }}
              />
              <div className="absolute right-3 flex items-center gap-1.5">
                {isAiLoading && <Loader2 size={16} className="animate-spin text-hack-primary" />}
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-hack-primary text-white text-xs font-700 hover:scale-105 transition-all"
                >
                  Search
                </button>
              </div>
            </form>

            {/* suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-2xl p-2 z-50 overflow-hidden shadow-2xl glass-panel animate-fade-in"
                style={{ border: "1px solid var(--hack-border)" }}
              >
                <div className="text-[10px] text-white/30 px-3 py-1 font-700 uppercase tracking-widest">
                  Suggestions
                </div>
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(item)}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-500 text-white/75 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Search size={13} className="text-white/20" />
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categories toggling pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
          {[
            { id: "all", label: "All Categories", icon: SlidersHorizontal },
            { id: "user", label: "Developers", icon: Users },
            { id: "team", label: "Teams", icon: Award },
            { id: "project", label: "Projects", icon: Terminal },
            { id: "hackathon", label: "Hackathons", icon: Calendar },
            { id: "organization", label: "Organizations", icon: Building }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-600 transition-all flex items-center gap-2 border flex-shrink-0 ${
                categoryFilter === cat.id
                  ? "bg-hack-primary/10 border-hack-primary text-hack-primary"
                  : "border-white/5 bg-white/3 text-white/50 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <cat.icon size={13} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Results tabs and Filters trigger */}
        <div className="flex items-center justify-between border-b border-hack-divider pb-4 flex-wrap gap-4">
          <div className="flex gap-2">
            {[
              { id: "all", label: "All Results" },
              { id: "recommended", label: "✨ Recommended For You" },
              { id: "priority", label: "🔥 Priority Matches" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-600 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-700 rounded-xl transition-all border ${
              isFilterOpen 
                ? "bg-hack-primary text-white border-hack-primary" 
                : "border-white/8 text-white/60 bg-white/2 hover:bg-white/5"
            }`}
          >
            <Filter size={13} />
            {isFilterOpen ? "Hide Filters" : "Advanced Filters"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Advanced Filters Panel */}
          {isFilterOpen && (
            <div className="lg:col-span-1 p-5 rounded-2xl glass-panel border border-hack-border space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-700 text-sm flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-hack-primary" />
                  Filters
                </h3>
                <button
                  onClick={clearAllFilters}
                  className="text-[10px] text-hack-primary font-700 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={8} />
                  Clear All
                </button>
              </div>

              {/* Domain Filter */}
              <div className="space-y-1.5">
                <label className="text-white/45 text-[10px] uppercase font-700 tracking-wider block">Domain</label>
                <select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="hack-input text-xs py-2 bg-[#131826] border-white/8 cursor-pointer"
                >
                  <option value="All Domains" style={{ background: "#131826" }}>All Domains</option>
                  <option value="AI/ML" style={{ background: "#131826" }}>AI/ML</option>
                  <option value="Web Development" style={{ background: "#131826" }}>Web Development</option>
                  <option value="Mobile Development" style={{ background: "#131826" }}>Mobile Development</option>
                  <option value="Cybersecurity" style={{ background: "#131826" }}>Cybersecurity</option>
                  <option value="Blockchain/Web3" style={{ background: "#131826" }}>Blockchain/Web3</option>
                </select>
              </div>

              {/* Skills Multi Filter */}
              <div className="space-y-1.5">
                <label className="text-white/45 text-[10px] uppercase font-700 tracking-wider block">Skills</label>
                <select
                  value={filterSkill}
                  onChange={(e) => setFilterSkill(e.target.value)}
                  className="hack-input text-xs py-2 bg-[#131826] border-white/8 cursor-pointer"
                >
                  <option value="All Skills" style={{ background: "#131826" }}>All Skills</option>
                  {allSkills.map(sk => (
                    <option key={sk} value={sk} style={{ background: "#131826" }}>{sk}</option>
                  ))}
                </select>
              </div>

              {/* Experience Filter */}
              <div className="space-y-1.5">
                <label className="text-white/45 text-[10px] uppercase font-700 tracking-wider block">Experience Level</label>
                <select
                  value={filterExperience}
                  onChange={(e) => setFilterExperience(e.target.value)}
                  className="hack-input text-xs py-2 bg-[#131826] border-white/8 cursor-pointer"
                >
                  <option value="All Levels" style={{ background: "#131826" }}>All Levels</option>
                  <option value="Beginner" style={{ background: "#131826" }}>Beginner (&lt; 2 yrs)</option>
                  <option value="Intermediate" style={{ background: "#131826" }}>Intermediate (2-5 yrs)</option>
                  <option value="Advanced" style={{ background: "#131826" }}>Advanced (5+ yrs)</option>
                </select>
              </div>

              {/* Location Text Input */}
              <div className="space-y-1.5">
                <label className="text-white/45 text-[10px] uppercase font-700 tracking-wider block">Location</label>
                <input
                  type="text"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder="e.g. Chennai, Bangalore"
                  className="hack-input text-xs py-2 border-white/8"
                />
              </div>

              {/* Availability Filter */}
              <div className="space-y-1.5">
                <label className="text-white/45 text-[10px] uppercase font-700 tracking-wider block">Developer Availability</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "All", label: "All" },
                    { id: "available", label: "Available" },
                    { id: "open", label: "Open" },
                    { id: "busy", label: "Busy" }
                  ].map(av => (
                    <button
                      key={av.id}
                      onClick={() => setFilterAvailability(av.id)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-700 transition-all border ${
                        filterAvailability === av.id
                          ? "bg-hack-primary border-hack-primary text-white"
                          : "border-white/5 bg-white/3 text-white/50 hover:bg-white/5"
                      }`}
                    >
                      {av.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trust Score Filter Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-700 tracking-wider text-white/45">
                  <span>Min Trust Score</span>
                  <span className="text-hack-primary font-800">{filterMinTrustScore} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={filterMinTrustScore}
                  onChange={(e) => setFilterMinTrustScore(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: "#7C5CFF" }}
                />
              </div>

              {/* Hackathon Category Filter */}
              <div className="space-y-1.5">
                <label className="text-white/45 text-[10px] uppercase font-700 tracking-wider block">Event Theme</label>
                <select
                  value={filterHackathonCategory}
                  onChange={(e) => setFilterHackathonCategory(e.target.value)}
                  className="hack-input text-xs py-2 bg-[#131826] border-white/8 cursor-pointer"
                >
                  <option value="All Categories" style={{ background: "#131826" }}>All Categories</option>
                  <option value="General" style={{ background: "#131826" }}>General</option>
                  <option value="AI/ML" style={{ background: "#131826" }}>AI/ML / DeepTech</option>
                  <option value="Web3" style={{ background: "#131826" }}>Blockchain / Web3</option>
                  <option value="Cybersecurity" style={{ background: "#131826" }}>Cybersecurity</option>
                  <option value="Health" style={{ background: "#131826" }}>Healthcare</option>
                  <option value="Fintech" style={{ background: "#131826" }}>Fintech</option>
                </select>
              </div>
            </div>
          )}

          {/* Results Display */}
          <div className={`${isFilterOpen ? "lg:col-span-3" : "lg:col-span-4"} space-y-6`}>
            
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-32 space-y-4">
                <Loader2 size={40} className="animate-spin text-hack-primary" />
                <p className="text-white/40 text-sm font-500">Retrieving HackOS registry...</p>
              </div>
            ) : tabItems.length === 0 ? (
              <div className="text-center py-24 bg-hack-card rounded-3xl border border-hack-border shadow-2xl flex flex-col items-center justify-center p-6">
                <Search size={48} className="text-white/10 mb-4 animate-pulse" />
                <h3 className="text-white font-700 text-lg mb-2">No matching results found</h3>
                <p className="text-white/45 text-sm max-w-sm">
                  We couldn't find matches matching those specifications. Try modifying your filters or terms.
                </p>
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setSearchParams({}); }}
                    className="mt-6 hack-btn-primary py-2 px-5 text-xs font-700"
                  >
                    Reset Search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {tabItems.map((item) => {
                  
                  // DEVELOPER CARD RENDERER
                  if (item.type === "user") {
                    const dev = item.originalData as Teammate;
                    const availabilityColor: Record<string, string> = {
                      available: "#22C55E",
                      open: "#4F7CFF",
                      busy: "#F59E0B",
                      unavailable: "#EF4444"
                    };
                    return (
                      <div key={item.id} className="hack-card p-5 flex flex-col justify-between h-full relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                          {activeTab !== "all" && <MatchScoreRing score={item.compatibilityScore} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-3.5 mb-4">
                            <div className="relative">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-12 h-12 rounded-full object-cover border-2 border-hack-primary/25"
                              />
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-hack-card"
                                style={{ background: availabilityColor[dev.availability || "available"] }}
                                title={dev.availability}
                              />
                            </div>
                            <div>
                              <h4 className="text-white font-700 text-sm truncate max-w-[140px] group-hover:text-hack-primary transition-colors">
                                {item.title}
                              </h4>
                              <p className="text-hack-primary font-600 text-xs truncate max-w-[140px]">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-white/50 text-xs mb-3">
                            <MapPin size={12} className="text-white/30" />
                            <span className="truncate">{dev.location}</span>
                          </div>

                          <p className="text-white/40 text-xs line-clamp-2 mb-4 h-8 leading-relaxed">
                            {dev.college || "HackOS Builder"}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {item.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="skill-tag text-[10px]">{tag}</span>
                            ))}
                            {item.tags.length > 3 && (
                              <span className="skill-tag text-[10px]">+{item.tags.length - 3}</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          {item.explanation && (
                            <div className="text-[10px] font-700 px-2.5 py-1.5 rounded-lg border border-hack-primary/20 text-hack-primary/90 bg-hack-primary/5 line-clamp-1 text-center">
                              ✨ {item.explanation}
                            </div>
                          )}

                          <Link
                            to={item.url}
                            className="block w-full text-center text-xs font-700 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            View Builder Profile
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  // TEAM CARD RENDERER
                  if (item.type === "team") {
                    const team = item.originalData as Team;
                    return (
                      <div key={item.id} className="hack-card p-5 flex flex-col justify-between h-full relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                          {activeTab !== "all" && <MatchScoreRing score={item.compatibilityScore} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-3.5 mb-4">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border"
                              style={{ background: `${team.color}15`, borderColor: `${team.color}30` }}
                            >
                              {team.icon}
                            </div>
                            <div>
                              <h4 className="text-white font-700 text-sm truncate max-w-[145px] group-hover:text-hack-primary transition-colors">
                                {item.title}
                              </h4>
                              <p className="text-white/45 text-xs">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>

                          <p className="text-white/40 text-xs line-clamp-3 mb-4 h-12 leading-relaxed">
                            {item.description}
                          </p>

                          <div className="space-y-1.5 mb-4">
                            <div className="text-[10px] text-white/40 font-700 uppercase tracking-widest">Looking For:</div>
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 2).map((role) => (
                                <span key={role} className="tag text-[10px] text-hack-primary bg-hack-primary/5 border-hack-primary/20">{role}</span>
                              ))}
                              {item.tags.length > 2 && (
                                <span className="tag text-[10px]">+{item.tags.length - 2} roles</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          {item.explanation && (
                            <div className="text-[10px] font-700 px-2.5 py-1.5 rounded-lg border border-[#4F7CFF]/20 text-[#4F7CFF]/90 bg-[#4F7CFF]/5 line-clamp-1 text-center">
                              💡 {item.explanation}
                            </div>
                          )}

                          <Link
                            to={item.url}
                            className="block w-full text-center text-xs font-700 py-2.5 rounded-xl bg-[#7C5CFF]/15 hover:bg-[#7C5CFF]/25 text-white hover:scale-[1.02] transition-all border border-[#7C5CFF]/30"
                          >
                            Apply to Team
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  // PROJECT CARD RENDERER
                  if (item.type === "project") {
                    const proj = item.originalData as UserProject;
                    return (
                      <div key={item.id} className="hack-card p-5 flex flex-col justify-between h-full relative group">
                        <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                          {activeTab !== "all" && <MatchScoreRing score={item.compatibilityScore} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-white/20 text-[10px] uppercase font-700 tracking-wider flex items-center gap-1 border border-white/5 bg-white/3 px-2 py-0.5 rounded-md">
                              <Terminal size={10} />
                              Project
                            </span>
                          </div>

                          <h4 className="text-white font-700 text-sm mb-2 truncate max-w-[160px] group-hover:text-hack-primary transition-colors">
                            {item.title}
                          </h4>

                          <p className="text-white/40 text-xs line-clamp-3 mb-4 h-12 leading-relaxed">
                            {item.description}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {item.tags.slice(0, 3).map((tech) => (
                              <span key={tech} className="skill-tag text-[10px]">{tech}</span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          {item.explanation && (
                            <div className="text-[10px] font-700 px-2.5 py-1.5 rounded-lg border border-[#F59E0B]/20 text-[#F59E0B]/90 bg-[#F59E0B]/5 line-clamp-1 text-center font-mono">
                              {item.explanation}
                            </div>
                          )}

                          <div className="flex gap-2">
                            {proj.github_url && (
                              <a
                                href={proj.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 text-center text-xs font-700 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/8 flex items-center justify-center gap-1.5"
                              >
                                Codebase
                                <ExternalLink size={12} />
                              </a>
                            )}
                            <Link
                              to={item.url}
                              className="flex-1 text-center text-xs font-700 py-2.5 rounded-xl bg-hack-primary hover:bg-hack-primary/95 text-white transition-colors flex items-center justify-center"
                            >
                              Author Info
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // HACKATHON CARD RENDERER
                  if (item.type === "hackathon") {
                    const hack = item.originalData as Hackathon;
                    return (
                      <div key={item.id} className="hack-card flex flex-col h-full relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 z-10 flex items-center gap-2">
                          {activeTab !== "all" && <MatchScoreRing score={item.compatibilityScore} />}
                        </div>

                        <div className="relative">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-36 object-cover border-b border-hack-divider group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute bottom-2 left-2 flex gap-1.5">
                            <span className="tag text-[9px] online-tag shadow-lg">{hack.mode}</span>
                          </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-white font-700 text-sm mb-1.5 line-clamp-1 group-hover:text-hack-primary transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-white/45 text-[11px] mb-3 truncate">
                              Organizer: {hack.organizer}
                            </p>

                            <p className="text-white/40 text-xs line-clamp-2 mb-4 h-8 leading-relaxed">
                              {item.description}
                            </p>

                            <div className="flex flex-wrap gap-1 mb-4">
                              {item.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="tag text-[9px]">{tag}</span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-hack-primary font-800 text-sm">{hack.prize}</span>
                              <span className="days-left">{hack.daysLeft} Days Left</span>
                            </div>

                            {item.explanation && (
                              <div className="text-[10px] font-700 px-2.5 py-1.5 rounded-lg border border-hack-primary/20 text-hack-primary/90 bg-hack-primary/5 line-clamp-1 text-center">
                                🎖️ {item.explanation}
                              </div>
                            )}

                            <Link
                              to={item.url}
                              className="block w-full text-center text-xs font-700 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/8"
                            >
                              Register Now
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ORGANIZATION CARD RENDERER
                  if (item.type === "organization") {
                    const org = item.originalData as OrganizationItem;
                    return (
                      <div key={item.id} className="hack-card p-5 flex flex-col justify-between h-full relative group">
                        <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                          {activeTab !== "all" && <MatchScoreRing score={item.compatibilityScore} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] flex items-center justify-center text-lg">
                              {org.type === "Academic Institution" ? <GraduationCap size={18} /> : <Building size={18} />}
                            </div>
                            <div>
                              <h4 className="text-white font-700 text-sm line-clamp-1 max-w-[140px] group-hover:text-hack-primary transition-colors">
                                {item.title}
                              </h4>
                              <span className="text-[9px] uppercase font-800 text-white/30 tracking-widest block">
                                {org.type}
                              </span>
                            </div>
                          </div>

                          <p className="text-white/40 text-xs line-clamp-3 mb-4 h-12 leading-relaxed">
                            {item.description}
                          </p>

                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white/2 border border-white/5 mb-4 text-center">
                            <div>
                              <div className="text-white font-700 text-sm">{org.hackathonsCount}</div>
                              <div className="text-white/35 text-[9px] uppercase tracking-wider">Events</div>
                            </div>
                            <div>
                              <div className="text-white font-700 text-sm">{org.usersCount}</div>
                              <div className="text-white/35 text-[9px] uppercase tracking-wider">Builders</div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          {item.explanation && (
                            <div className="text-[10px] font-700 px-2.5 py-1.5 rounded-lg border border-[#22C55E]/20 text-[#22C55E]/90 bg-[#22C55E]/5 line-clamp-1 text-center">
                              🏢 {item.explanation}
                            </div>
                          )}

                          <Link
                            to={item.url}
                            className="block w-full text-center text-xs font-700 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/8"
                          >
                            Explore Institution
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
