import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { SKILLS_LIST, ROLES } from "@/constants";
import { analyzeSearchQuery, SearchQueryAnalysis } from "@/lib/groq";

// Local cache to store Groq query analyses to prevent duplicate calls and rate-limiting
const queryAnalysisCache = new Map<string, SearchQueryAnalysis>();

export function useSearchSuggestions(query: string) {
  const [localGlossary, setLocalGlossary] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<SearchQueryAnalysis | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // 1. Prefetch team names and hackathon titles on mount to populate local suggestions
  useEffect(() => {
    async function prefetchGlossary() {
      try {
        const [
          { data: hackathons },
          { data: teams },
          { data: profiles }
        ] = await Promise.all([
          supabase.from("hackathons").select("title, category").limit(50),
          supabase.from("teams").select("name, category").limit(50),
          supabase.from("profiles").select("college, location").limit(100)
        ]);

        const titles = [
          ...SKILLS_LIST,
          ...ROLES,
          "Artificial Intelligence",
          "Machine Learning",
          "Deep Learning",
          "Natural Language Processing",
          "Computer Vision",
          "Generative AI",
          "Cybersecurity",
          "Ethical Hacking",
          "Network Security",
          "Web Development",
          "Mobile Development",
          "SaaS",
          "Fintech",
          "Healthcare AI",
          "Web3",
          "Smart Contracts",
          "Solidity"
        ];

        if (hackathons) {
          hackathons.forEach(h => {
            if (h.title) titles.push(h.title);
            if (h.category) titles.push(h.category);
          });
        }
        if (teams) {
          teams.forEach(t => {
            if (t.name) titles.push(t.name);
            if (t.category) titles.push(t.category);
          });
        }
        if (profiles) {
          profiles.forEach(p => {
            if (p.college) titles.push(p.college);
            if (p.location) titles.push(p.location);
          });
        }

        // Deduplicate and filter empty strings
        const uniqueGlossary = Array.from(new Set(titles)).filter(t => !!t && t.trim() !== "");
        setLocalGlossary(uniqueGlossary);
      } catch (err) {
        console.error("Failed to build local search glossary:", err);
      }
    }

    prefetchGlossary();
  }, []);

  // 2. Instant local suggestions matching user query
  const instantSuggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    return localGlossary
      .filter(item => item.toLowerCase().includes(trimmed))
      .sort((a, b) => {
        // Boost terms starting with the query
        const aStart = a.toLowerCase().startsWith(trimmed);
        const bStart = b.toLowerCase().startsWith(trimmed);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return a.length - b.length; // prefer shorter terms
      })
      .slice(0, 6);
  }, [query, localGlossary]);

  // 3. Debounce and run Groq Search Intent Analysis
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setAiAnalysis(null);
      setIsAiLoading(false);
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Check if query exists in local cache first
    const cachedResult = queryAnalysisCache.get(trimmed.toLowerCase());
    if (cachedResult) {
      setAiAnalysis(cachedResult);
      setIsAiLoading(false);
      return;
    }

    setIsAiLoading(true);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const analysis = await analyzeSearchQuery(trimmed);
        
        // Cache the analysis result
        queryAnalysisCache.set(trimmed.toLowerCase(), analysis);
        
        setAiAnalysis(analysis);
      } catch (err) {
        console.error("Failed to fetch Groq query analysis:", err);
      } finally {
        setIsAiLoading(false);
      }
    }, 450); // 450ms debounce

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  // Combine local suggestions and AI suggestions (ensuring deduplicated options)
  const combinedSuggestions = useMemo(() => {
    const aiSuggs = aiAnalysis?.aiSuggestions || [];
    const combined = [...instantSuggestions];

    aiSuggs.forEach(s => {
      if (!combined.some(c => c.toLowerCase() === s.toLowerCase())) {
        combined.push(s);
      }
    });

    return combined.slice(0, 8); // cap at 8 recommendations
  }, [instantSuggestions, aiAnalysis]);

  return {
    suggestions: combinedSuggestions,
    aiAnalysis,
    isAiLoading,
    localGlossary
  };
}
