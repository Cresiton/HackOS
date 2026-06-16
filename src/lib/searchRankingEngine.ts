import { Teammate, User, Team, Hackathon, UserProject } from "@/types";
import { SearchQueryAnalysis } from "./groq";

export interface SearchItem {
  id: string;
  type: "user" | "team" | "project" | "hackathon" | "organization";
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  url: string;
  tags: string[];
  originalData: any;
  relevanceScore: number;
  compatibilityScore: number;
  explanation?: string;
}

export interface OrganizationItem {
  id: string;
  name: string;
  type: "Academic Institution" | "Sponsor/Organizer";
  hackathonsCount: number;
  usersCount: number;
  description: string;
  skills: string[];
}

// Distance helper
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if profile has AI experience
function hasAIExperience(profile: Teammate | User): boolean {
  const aiKeywords = ["ai", "ml", "machine learning", "deep learning", "nlp", "computer vision", "generative ai", "llm", "llms", "data science", "tensorflow", "pytorch", "scikit-learn"];
  const roleText = (profile.role || "").toLowerCase();
  const bioText = (profile.bio || "").toLowerCase();
  const skillsText = (profile.skills || []).map(s => s.toLowerCase());

  const hasRoleMatch = aiKeywords.some(kw => roleText.includes(kw));
  const hasSkillMatch = aiKeywords.some(kw => skillsText.some(s => s.includes(kw)));
  const hasBioMatch = aiKeywords.some(kw => bioText.includes(kw));

  return hasRoleMatch || hasSkillMatch || hasBioMatch;
}

// Check if profile has Cybersecurity experience
function hasCybersecurityExperience(profile: Teammate | User): boolean {
  const cyberKeywords = ["cyber", "security", "pentest", "hacking", "cryptography", "network security", "ethical hacking", "firewall"];
  const roleText = (profile.role || "").toLowerCase();
  const bioText = (profile.bio || "").toLowerCase();
  const skillsText = (profile.skills || []).map(s => s.toLowerCase());

  return cyberKeywords.some(kw => roleText.includes(kw)) ||
         cyberKeywords.some(kw => skillsText.some(s => s.includes(kw))) ||
         cyberKeywords.some(kw => bioText.includes(kw));
}

// Check if profile has Flutter experience
function hasFlutterExperience(profile: Teammate | User): boolean {
  const flutterKeywords = ["flutter", "dart", "react native", "mobile developer"];
  const roleText = (profile.role || "").toLowerCase();
  const bioText = (profile.bio || "").toLowerCase();
  const skillsText = (profile.skills || []).map(s => s.toLowerCase());

  return flutterKeywords.some(kw => roleText.includes(kw)) ||
         flutterKeywords.some(kw => skillsText.some(s => s.includes(kw))) ||
         flutterKeywords.some(kw => bioText.includes(kw));
}

// High-level ranking function
export function searchAndRank(
  rawQuery: string,
  analysis: SearchQueryAnalysis,
  currentUser: User | null,
  userRegistrations: string[], // hackathon IDs user is registered for
  candidates: Teammate[],
  teams: Team[],
  projects: UserProject[],
  hackathons: Hackathon[],
  organizations: OrganizationItem[]
): SearchItem[] {
  const q = rawQuery.toLowerCase().trim();
  const results: SearchItem[] = [];

  // 1. Compile User Items
  candidates.forEach(c => {
    let relevanceScore = 0;
    let compatibilityScore = 50; // base compatibility
    let reasons: string[] = [];

    // STRICT CATEGORY FILTERING (Requirement 1)
    if (analysis.isAiFocused && !hasAIExperience(c)) {
      // Exclude completely if they don't have AI experience
      return;
    }
    if (analysis.isCybersecurityFocused && !hasCybersecurityExperience(c)) {
      return;
    }
    if (analysis.isFlutterFocused && !hasFlutterExperience(c)) {
      return;
    }

    // Relevance matching
    if (q) {
      if (c.name.toLowerCase().includes(q)) relevanceScore += 100;
      if (c.role.toLowerCase().includes(q)) relevanceScore += 80;
      c.skills.forEach(s => {
        if (s.toLowerCase().includes(q)) relevanceScore += 40;
      });
      if (c.location.toLowerCase().includes(q)) relevanceScore += 30;
      if (c.college?.toLowerCase().includes(q)) relevanceScore += 30;
    }

    // Semantic matching (Requirement 4)
    analysis.expandedKeywords.forEach(kw => {
      const lowerKw = kw.toLowerCase();
      if (c.role.toLowerCase().includes(lowerKw)) relevanceScore += 30;
      if (c.bio?.toLowerCase().includes(lowerKw)) relevanceScore += 15;
      c.skills.forEach(s => {
        if (s.toLowerCase().includes(lowerKw)) relevanceScore += 20;
      });
    });

    analysis.preferredRoles.forEach(r => {
      if (c.role.toLowerCase().includes(r.toLowerCase())) relevanceScore += 25;
    });

    analysis.preferredSkills.forEach(s => {
      if (c.skills.some(skill => skill.toLowerCase() === s.toLowerCase())) relevanceScore += 20;
    });

    // Compatibility matching (Requirement 3 & 5)
    if (currentUser) {
      // Skill overlap
      const userSkills = currentUser.skills || [];
      if (userSkills.length > 0) {
        const overlap = c.skills.filter(s => userSkills.some(us => us.toLowerCase() === s.toLowerCase()));
        const overlapPercent = Math.round((overlap.length / userSkills.length) * 100);
        compatibilityScore += Math.min(30, overlapPercent * 0.4);
        if (overlap.length > 0) reasons.push("Skill overlap");
      }

      // Role synergy (Frontend + Backend, etc.)
      const uRole = (currentUser.role || "").toLowerCase();
      const cRole = (c.role || "").toLowerCase();
      if (uRole.includes("front") && cRole.includes("back")) {
        compatibilityScore += 15;
        reasons.push("Complementary developer");
      } else if (uRole.includes("back") && cRole.includes("front")) {
        compatibilityScore += 15;
        reasons.push("Complementary developer");
      } else if (uRole.includes("design") && (cRole.includes("front") || cRole.includes("full"))) {
        compatibilityScore += 15;
        reasons.push("Design-dev synergy");
      } else if (cRole === uRole) {
        compatibilityScore += 5;
      }

      // Availability (Highest Priority matches)
      const availabilityMap: Record<string, number> = {
        available: 15,
        open: 10,
        busy: 2,
        unavailable: -10
      };
      const availScore = availabilityMap[c.availability || "available"] || 5;
      compatibilityScore += availScore;
      if (c.availability === "available" || c.availability === "open") {
        reasons.push("Active & available");
      }

      // Experience match
      if (c.experience && currentUser.experience && c.experience === currentUser.experience) {
        compatibilityScore += 10;
        reasons.push("Similar experience");
      }

      // Trust score contribution
      const trustVal = c.trustScore || 50;
      compatibilityScore += Math.round(trustVal * 0.15);
      if (trustVal >= 75) reasons.push("High trust score");

      // Github activity
      if (c.github_connected || c.github_username) {
        compatibilityScore += 8;
        reasons.push("Verified GitHub activity");
      }

      // Proximity
      if (currentUser.latitude && currentUser.longitude && c.latitude && c.longitude) {
        const dist = getDistanceInKm(currentUser.latitude, currentUser.longitude, c.latitude, c.longitude);
        if (dist <= 50) {
          compatibilityScore += 12;
          reasons.push("Nearby collaborator");
        }
      }
    }

    compatibilityScore = Math.max(0, Math.min(100, compatibilityScore));

    // Fallback relevance check: if query exists but relevance is 0, skip showing it in strict/search modes unless matches query
    if (q && relevanceScore === 0) return;

    results.push({
      id: `u-${c.id}`,
      type: "user",
      title: c.name,
      subtitle: c.role || "Full Stack Developer",
      description: c.college || c.location || "Developer profile",
      image: c.avatar,
      url: `/profile/${c.id}`,
      tags: c.skills,
      originalData: c,
      relevanceScore,
      compatibilityScore,
      explanation: reasons.length > 0 ? reasons.slice(0, 2).join(" • ") : "Compatible builder"
    });
  });

  // 2. Compile Team Items
  teams.forEach(t => {
    let relevanceScore = 0;
    let compatibilityScore = 50;
    let reasons: string[] = [];

    // STRICT CATEGORY FILTERING
    const descText = t.description.toLowerCase();
    const catText = (t.category || "").toLowerCase();
    const reqText = (t.requiredRoles || []).map(r => r.toLowerCase()).join(" ");

    const hasAI = descText.includes("ai") || descText.includes("machine learning") || descText.includes("ml") || catText.includes("ai") || catText.includes("ml") || reqText.includes("ai") || reqText.includes("ml");
    if (analysis.isAiFocused && !hasAI) return;

    const hasCyber = descText.includes("cyber") || descText.includes("security") || catText.includes("cyber") || catText.includes("security");
    if (analysis.isCybersecurityFocused && !hasCyber) return;

    const hasFlutter = descText.includes("flutter") || descText.includes("dart") || catText.includes("flutter") || reqText.includes("flutter");
    if (analysis.isFlutterFocused && !hasFlutter) return;

    // Relevance matching
    if (q) {
      if (t.name.toLowerCase().includes(q)) relevanceScore += 100;
      if (t.category.toLowerCase().includes(q)) relevanceScore += 60;
      if (t.description.toLowerCase().includes(q)) relevanceScore += 40;
      t.requiredRoles.forEach(r => {
        if (r.toLowerCase().includes(q)) relevanceScore += 30;
      });
    }

    // Semantic matching
    analysis.expandedKeywords.forEach(kw => {
      const lowerKw = kw.toLowerCase();
      if (t.description.toLowerCase().includes(lowerKw)) relevanceScore += 25;
      if (t.category.toLowerCase().includes(lowerKw)) relevanceScore += 25;
    });

    // Compatibility matching
    if (currentUser) {
      // Required role matches user's role
      const userRole = (currentUser.role || "").toLowerCase();
      const roleMatch = t.requiredRoles.some(r => r.toLowerCase().includes(userRole) || userRole.includes(r.toLowerCase()));
      if (roleMatch) {
        compatibilityScore += 30;
        reasons.push("Looking for your role");
      }

      // User skills match required roles or description
      const userSkills = currentUser.skills || [];
      let skillMatchCount = 0;
      userSkills.forEach(s => {
        const lowerS = s.toLowerCase();
        if (t.description.toLowerCase().includes(lowerS) || t.category.toLowerCase().includes(lowerS)) {
          skillMatchCount++;
        }
      });
      if (skillMatchCount > 0) {
        compatibilityScore += Math.min(25, skillMatchCount * 5);
        reasons.push("Skills match project goals");
      }

      // Recruitment status
      if (t.status === "recruiting") {
        compatibilityScore += 20;
        reasons.push("Actively recruiting");
      }
    }

    compatibilityScore = Math.max(0, Math.min(100, compatibilityScore));

    if (q && relevanceScore === 0) return;

    results.push({
      id: `t-${t.id}`,
      type: "team",
      title: t.name,
      subtitle: `Recruiting • ${t.category}`,
      description: t.description.split("---METADATA---")[0].trim() || "Hackathon team",
      url: `/my-teams`, // Deep link
      tags: t.requiredRoles,
      originalData: t,
      relevanceScore,
      compatibilityScore,
      explanation: reasons.length > 0 ? reasons.slice(0, 2).join(" • ") : "Available team opportunity"
    });
  });

  // 3. Compile Project Items
  projects.forEach(p => {
    let relevanceScore = 0;
    let compatibilityScore = 50;
    let reasons: string[] = [];

    // STRICT CATEGORY FILTERING
    const projDesc = (p.description || "").toLowerCase();
    const projTitle = p.title.toLowerCase();
    const projStack = (p.tech_stack || []).map(s => s.toLowerCase());

    const hasAI = projTitle.includes("ai") || projTitle.includes("ml") || projTitle.includes("machine learning") || projDesc.includes("ai") || projDesc.includes("ml") || projDesc.includes("machine learning") || projStack.some(s => s.includes("pytorch") || s.includes("tensorflow") || s.includes("nlp") || s.includes("vision"));
    if (analysis.isAiFocused && !hasAI) return;

    const hasCyber = projTitle.includes("cyber") || projTitle.includes("security") || projDesc.includes("cyber") || projDesc.includes("security") || projStack.some(s => s.includes("crypt") || s.includes("auth"));
    if (analysis.isCybersecurityFocused && !hasCyber) return;

    const hasFlutter = projTitle.includes("flutter") || projDesc.includes("flutter") || projStack.includes("flutter");
    if (analysis.isFlutterFocused && !hasFlutter) return;

    // Relevance matching
    if (q) {
      if (p.title.toLowerCase().includes(q)) relevanceScore += 100;
      if (p.description?.toLowerCase().includes(q)) relevanceScore += 50;
      p.tech_stack.forEach(ts => {
        if (ts.toLowerCase().includes(q)) relevanceScore += 30;
      });
    }

    // Semantic matching
    analysis.expandedKeywords.forEach(kw => {
      const lowerKw = kw.toLowerCase();
      if (p.title.toLowerCase().includes(lowerKw)) relevanceScore += 30;
      if (p.description?.toLowerCase().includes(lowerKw)) relevanceScore += 20;
      p.tech_stack.forEach(ts => {
        if (ts.toLowerCase().includes(lowerKw)) relevanceScore += 15;
      });
    });

    // Compatibility matching
    if (currentUser) {
      // Tech stack overlap
      const userSkills = currentUser.skills || [];
      const overlap = p.tech_stack.filter(ts => userSkills.some(us => us.toLowerCase() === ts.toLowerCase()));
      if (overlap.length > 0) {
        compatibilityScore += Math.min(30, overlap.length * 8);
        reasons.push("Tech stack synergy");
      }

      // Description match user role
      const userRole = (currentUser.role || "").toLowerCase();
      if (p.description?.toLowerCase().includes(userRole)) {
        compatibilityScore += 15;
        reasons.push("Matches role interests");
      }

      // Link quality
      if (p.github_url || p.live_url) {
        compatibilityScore += 10;
        reasons.push("Has code repository");
      }
    }

    compatibilityScore = Math.max(0, Math.min(100, compatibilityScore));

    if (q && relevanceScore === 0) return;

    results.push({
      id: `p-proj-${p.id}`,
      type: "project",
      title: p.title,
      subtitle: `Project by user`,
      description: p.description || "Portfolio project built by HackOS collaborator.",
      url: `/profile/${p.user_id}`,
      tags: p.tech_stack,
      originalData: p,
      relevanceScore,
      compatibilityScore,
      explanation: reasons.length > 0 ? reasons.slice(0, 2).join(" • ") : "Portfolio project"
    });
  });

  // 4. Compile Hackathon Items
  hackathons.forEach(h => {
    let relevanceScore = 0;
    let compatibilityScore = 50;
    let reasons: string[] = [];

    // STRICT CATEGORY FILTERING
    const hTitle = h.title.toLowerCase();
    const hDesc = h.description.toLowerCase();
    const hTags = h.tags.map(t => t.toLowerCase());

    const hasAI = hTitle.includes("ai") || hTitle.includes("ml") || hTitle.includes("machine") || hDesc.includes("ai") || hDesc.includes("ml") || hDesc.includes("machine") || hTags.some(t => t.includes("ai") || t.includes("ml") || t.includes("machine") || t.includes("data"));
    if (analysis.isAiFocused && !hasAI) return;

    const hasCyber = hTitle.includes("cyber") || hTitle.includes("security") || hDesc.includes("cyber") || hDesc.includes("security") || hTags.some(t => t.includes("security") || t.includes("hack"));
    if (analysis.isCybersecurityFocused && !hasCyber) return;

    const hasFlutter = hTitle.includes("flutter") || hDesc.includes("flutter") || hTags.includes("flutter") || hTags.includes("mobile");
    if (analysis.isFlutterFocused && !hasFlutter) return;

    // Relevance matching
    if (q) {
      if (h.title.toLowerCase().includes(q)) relevanceScore += 100;
      if (h.organizer.toLowerCase().includes(q)) relevanceScore += 60;
      if (h.description.toLowerCase().includes(q)) relevanceScore += 45;
      h.tags.forEach(t => {
        if (t.toLowerCase().includes(q)) relevanceScore += 30;
      });
    }

    // Semantic matching
    analysis.expandedKeywords.forEach(kw => {
      const lowerKw = kw.toLowerCase();
      if (h.title.toLowerCase().includes(lowerKw)) relevanceScore += 30;
      if (h.description.toLowerCase().includes(lowerKw)) relevanceScore += 20;
      h.tags.forEach(t => {
        if (t.toLowerCase().includes(lowerKw)) relevanceScore += 15;
      });
    });

    // Compatibility matching
    if (currentUser) {
      // Tags overlap with skills
      const userSkills = currentUser.skills || [];
      const overlap = h.tags.filter(t => userSkills.some(us => us.toLowerCase() === t.toLowerCase() || t.toLowerCase().includes(us.toLowerCase())));
      if (overlap.length > 0) {
        compatibilityScore += Math.min(30, overlap.length * 8);
        reasons.push("Skill match");
      }

      // Past participation alignment (previous hackathons by tags/organizer)
      const userPrefCategory = currentUser.domains || [];
      const categoryMatch = userPrefCategory.some(c => h.tags.some(t => t.toLowerCase().includes(c.toLowerCase())));
      if (categoryMatch) {
        compatibilityScore += 20;
        reasons.push("Matches preferred domain");
      }

      if (userRegistrations.includes(h.id)) {
        compatibilityScore += 25;
        reasons.push("Registered participant");
      }
    }

    compatibilityScore = Math.max(0, Math.min(100, compatibilityScore));

    if (q && relevanceScore === 0) return;

    results.push({
      id: `h-${h.id}`,
      type: "hackathon",
      title: h.title,
      subtitle: `${h.organizer} • ${h.mode}`,
      description: h.description,
      image: h.image,
      url: `/hackathon/${h.id}`,
      tags: h.tags,
      originalData: h,
      relevanceScore,
      compatibilityScore,
      explanation: reasons.length > 0 ? reasons.slice(0, 2).join(" • ") : "Recommended hackathon"
    });
  });

  // 5. Compile Organization Items
  organizations.forEach(o => {
    let relevanceScore = 0;
    let compatibilityScore = 50;
    let reasons: string[] = [];

    // Relevance matching
    if (q) {
      if (o.name.toLowerCase().includes(q)) relevanceScore += 100;
      if (o.type.toLowerCase().includes(q)) relevanceScore += 50;
      if (o.description.toLowerCase().includes(q)) relevanceScore += 40;
    }

    // Semantic matching
    analysis.expandedKeywords.forEach(kw => {
      const lowerKw = kw.toLowerCase();
      if (o.name.toLowerCase().includes(lowerKw)) relevanceScore += 20;
      if (o.description.toLowerCase().includes(lowerKw)) relevanceScore += 15;
    });

    // Compatibility matching
    if (currentUser) {
      // User's college affiliation
      if (currentUser.college && o.name.toLowerCase().includes(currentUser.college.toLowerCase())) {
        compatibilityScore += 40;
        reasons.push("Your academic institution");
      }

      // Domain/Skills synergy
      const userSkills = currentUser.skills || [];
      const oSkills = o.skills || [];
      const overlap = oSkills.filter(os => userSkills.some(us => us.toLowerCase() === os.toLowerCase()));
      if (overlap.length > 0) {
        compatibilityScore += Math.min(20, overlap.length * 5);
        reasons.push("Domain match");
      }
    }

    compatibilityScore = Math.max(0, Math.min(100, compatibilityScore));

    if (q && relevanceScore === 0) return;

    results.push({
      id: `o-${o.id}`,
      type: "organization",
      title: o.name,
      subtitle: o.type,
      description: o.description,
      url: o.type === "Academic Institution" ? "/profile" : "/discover",
      tags: [
        `${o.hackathonsCount} Hackathons`,
        `${o.usersCount} Members`
      ],
      originalData: o,
      relevanceScore,
      compatibilityScore,
      explanation: reasons.length > 0 ? reasons.slice(0, 2).join(" • ") : "Affiliated organization"
    });
  });

  // Sort by final relevance score descending, then compatibility score
  return results.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return b.compatibilityScore - a.compatibilityScore;
  });
}

export type SearchMode = "All" | "Priority" | "AI Recommended";

export function rankCandidates(
  candidates: Teammate[],
  query: string,
  mode: SearchMode,
  currentUser: User | null
): Teammate[] {
  const q = query.toLowerCase();
  
  // Construct analysis query structure
  const analysis: SearchQueryAnalysis = {
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

  if (q.includes("ai") || q.includes("machine learning") || q.includes("ml") || q.includes("nlp") || q.includes("vision")) {
    analysis.isAiFocused = true;
    analysis.expandedKeywords = ["machine learning", "deep learning", "nlp", "computer vision", "generative ai", "llms"];
  } else if (q.includes("cyber") || q.includes("security")) {
    analysis.isCybersecurityFocused = true;
    analysis.expandedKeywords = ["cybersecurity", "security", "ethical hacking"];
  } else if (q.includes("flutter") || q.includes("dart")) {
    analysis.isFlutterFocused = true;
  }

  const items = searchAndRank(
    query,
    analysis,
    currentUser,
    [],
    candidates,
    [],
    [],
    [],
    []
  );

  let filtered = items;
  if (mode === "Priority") {
    filtered = items.filter(item => {
      const avail = (item.originalData as Teammate).availability;
      return avail === "available" || avail === "open";
    });
  } else if (mode === "AI Recommended") {
    filtered = items.filter(item => item.compatibilityScore >= 60);
  }

  return filtered.map(item => {
    const original = item.originalData as Teammate;
    return {
      ...original,
      searchScore: item.relevanceScore + item.compatibilityScore,
      explanation: item.explanation
    };
  });
}
