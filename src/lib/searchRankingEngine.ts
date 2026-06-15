import { Teammate, User } from "@/types";

export type SearchMode = "All" | "Priority" | "AI Recommended";

// Haversine formula to calculate distance between two coordinates
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

export function rankCandidates(
  candidates: Teammate[],
  query: string,
  mode: SearchMode,
  currentUser: User | null
): Teammate[] {
  // If no ranking is required, just return all candidates
  if (mode === "All") {
    return [...candidates].map(c => ({
      ...c,
      searchScore: 0,
      explanation: undefined
    }));
  }

  const q = query.toLowerCase().trim();

  // Score each candidate
  const scoredCandidates = candidates.map((candidate) => {
    let score = 0;
    let reasons: string[] = [];
    
    // 1. Availability Weight (Highest Priority)
    // Priority mode heavily relies on this. AI Recommended uses it as a strong base.
    const availabilityMap: Record<string, number> = {
      available: 100,
      open: 75,
      busy: 25,
      unavailable: 0
    };
    
    // User type has availability, but teammate object might not have it mapped yet.
    // Let's assume teammate has an implicit availability or we rely on `isOnline`.
    // Actually, in Dashboard.tsx we need to fetch 'availability' and map it. 
    // Let's assume it exists as `candidate.availability` or defaults to available for now.
    const availability = (candidate as any).availability || "open"; 
    const availScore = availabilityMap[availability] || 50;
    
    if (mode === "Priority") {
      score += availScore * 10; // Extremely high weight
      if (availScore >= 75) reasons.push("Available for teams");
    } else {
      score += availScore * 2; // AI mode weight
      if (availScore >= 75) reasons.push("Available for hackathons");
    }

    if (mode === "Priority") {
      // Priority mode only cares about availability and basic match
      return {
        ...candidate,
        searchScore: score,
        explanation: reasons[0] || "Basic match"
      };
    }

    // --- AI RECOMMENDED MODE LOGIC ---

    // 2. Trust Score Weight
    // trustScore ranges 0-100 (rating is out of 5, let's map rating to trust score if trustScore missing)
    const trustScore = (candidate as any).trustScore || (candidate.rating ? candidate.rating * 20 : 50);
    if (trustScore >= 90) {
      score += 50;
      reasons.push("Highly trusted");
    } else if (trustScore >= 75) {
      score += 30;
    } else if (trustScore >= 50) {
      score += 10;
    }

    // 3. Skills & Name Alignment
    if (q) {
      if (candidate.name.toLowerCase().includes(q)) {
        score += 100; // Exact/partial name match gets massive boost
        reasons.push("Exact name match");
      }

      let skillMatched = false;
      candidate.skills.forEach(skill => {
        if (skill.toLowerCase().includes(q) || q.includes(skill.toLowerCase())) {
          score += 40;
          skillMatched = true;
        }
      });
      if (skillMatched) reasons.push("Strong skills match");

      // 4. Primary Role Alignment
      if (candidate.role.toLowerCase().includes(q)) {
        score += 50;
        reasons.push(`Highly active ${candidate.role}`);
      }
    }

    // 5. GitHub Activity (Mocked using github_connected or basic assumption)
    if (candidate.github_connected || candidate.github_username) {
      score += 20;
      reasons.push("Strong GitHub activity");
    }

    // 6. Location Matching
    if (currentUser?.latitude && currentUser?.longitude && candidate.latitude && candidate.longitude) {
      const distance = getDistanceInKm(currentUser.latitude, currentUser.longitude, candidate.latitude, candidate.longitude);
      if (distance < 50) { // Within 50km
        score += 30;
        reasons.push("Nearby collaborator");
      }
    }

    // Generate final explanation
    let finalExplanation = "Good fit";
    if (reasons.length > 0) {
      // Pick the most impactful reason based on order of pushed reasons (or random)
      finalExplanation = reasons[0];
      if (reasons.length > 1) {
        // sometimes combine
        finalExplanation = `${reasons[0]} & ${reasons[1].toLowerCase()}`;
      }
    }

    return {
      ...candidate,
      searchScore: score,
      explanation: finalExplanation
    };
  });

  // For Priority mode, ONLY show users who are highly available
  if (mode === "Priority") {
    const priorityCandidates = scoredCandidates.filter(c => {
      const avail = (c as any).availability;
      return avail === "available" || avail === "open";
    });
    return priorityCandidates.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));
  }

  // Sort by computed score descending
  return scoredCandidates.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));
}
