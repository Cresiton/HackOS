import React, { createContext, useContext, useState, ReactNode } from "react";
import { callGroq } from "@/lib/groq";

export interface ProjectDetails {
  name: string;
  domain: string;
  problem: string;
  solution: string;
  techStack: string;
  targetAudience: string;
  level: string;
  stage: string;
}

export interface AnalysisData {
  overallScore: number;
  creativity: { subject: string; A: number; fullMark: number }[];
  metrics: { label: string; val: number; color: string; reason: string }[];
  usp: { status: "missing" | "good" | "excellent"; current: string; alternatives: string[] };
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  redFlags: string[];
  jurors: {
    role: string;
    avatar: string;
    score: number;
    feedback: string;
    focusAreas: string[];
    questions: string[];
    priority: "High" | "Medium" | "Low" | "Critical";
    color: string;
  }[];
  roadmap: {
    week: number;
    title: string;
    status: "completed" | "current" | "upcoming";
    tasks: string[];
  }[];
  probability: {
    regional: number;
    national: number;
    international: number;
  };
}

interface AIJuryContextType {
  projectDetails: ProjectDetails;
  setProjectDetails: React.Dispatch<React.SetStateAction<ProjectDetails>>;
  extractedText: string;
  setExtractedText: React.Dispatch<React.SetStateAction<string>>;
  analysisData: AnalysisData | null;
  setAnalysisData: React.Dispatch<React.SetStateAction<AnalysisData | null>>;
  parsedSlides: string[];
  setParsedSlides: React.Dispatch<React.SetStateAction<string[]>>;
  evaluateProject: () => Promise<void>;
  isEvaluating: boolean;
}

const AIJuryContext = createContext<AIJuryContextType | undefined>(undefined);

const defaultProjectDetails: ProjectDetails = {
  name: "",
  domain: "Other",
  problem: "",
  solution: "",
  techStack: "",
  targetAudience: "",
  level: "National",
  stage: "MVP",
};

export const AIJuryProvider = ({ children }: { children: ReactNode }) => {
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>(defaultProjectDetails);
  const [extractedText, setExtractedText] = useState("");
  const [parsedSlides, setParsedSlides] = useState<string[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const evaluateProject = async () => {
    setIsEvaluating(true);
    try {
      const prompt = `You are the world's best Hackathon AI Jury Panel (Technical, Business, UX, Investor, Professor).
Evaluate the following project. Respond ONLY with valid, parsable JSON matching the structure below.
Project Details:
Name: ${projectDetails.name}
Domain: ${projectDetails.domain}
Problem: ${projectDetails.problem}
Solution: ${projectDetails.solution}
Tech Stack: ${projectDetails.techStack}
Target Audience: ${projectDetails.targetAudience}
Level: ${projectDetails.level}
Stage: ${projectDetails.stage}

Extracted Document Text:
${extractedText.substring(0, 3000)}

JSON Structure to return:
{
  "overallScore": number (0-100),
  "creativity": [ { "subject": "Innovation", "A": number, "fullMark": 100 }, (must include Innovation, Originality, Thinking, Approach, Impact, Visual) ],
  "metrics": [ { "label": "Feasibility", "val": number, "color": "#00E676", "reason": "1 short sentence explaining why" }, (must include Feasibility, Innovation, Business, Technical, Presentation, Scalability, Market Fit, Execution) ],
  "usp": { "status": "missing"|"good"|"excellent", "current": "short evaluation of current usp", "alternatives": ["A highly unique, radically different, and perfectly clear alternative USP 1", "An innovative alternative USP 2", "A deeply compelling alternative USP 3"] },
  "swot": { "strengths": ["s1"], "weaknesses": ["w1"], "opportunities": ["o1"], "threats": ["t1"] },
  "redFlags": ["red flag 1", "red flag 2"],
  "jurors": [
    { "role": "Technical Architect", "avatar": "👨‍💻", "score": number, "feedback": "string", "focusAreas": ["Architecture", "Scalability", "Security"], "questions": ["Tough q1?", "Tough q2?"], "priority": "High"|"Medium"|"Low"|"Critical", "color": "#00D2FF" },
    { "role": "Startup Investor", "avatar": "🕴️", "score": number, "feedback": "string", "focusAreas": ["Market Size", "Revenue Model", "Moat"], "questions": ["Tough q1?", "Tough q2?"], "priority": "High"|"Medium"|"Low"|"Critical", "color": "#FFB300" },
    { "role": "UX Researcher", "avatar": "👩‍🎨", "score": number, "feedback": "string", "focusAreas": ["User Flow", "Accessibility", "Retention"], "questions": ["Tough q1?", "Tough q2?"], "priority": "High"|"Medium"|"Low"|"Critical", "color": "#6D5EF5" },
    { "role": "Domain Expert", "avatar": "👨‍🏫", "score": number, "feedback": "string", "focusAreas": ["Accuracy", "Compliance", "Real-world impact"], "questions": ["Tough q1?", "Tough q2?"], "priority": "High"|"Medium"|"Low"|"Critical", "color": "#00E676" },
    { "role": "Product Manager", "avatar": "👩‍💼", "score": number, "feedback": "string", "focusAreas": ["GTM Strategy", "MVP Scope", "Prioritization"], "questions": ["Tough q1?", "Tough q2?"], "priority": "High"|"Medium"|"Low"|"Critical", "color": "#FF5252" }
  ],
  "roadmap": [ { "week": number (1-6), "title": "string", "status": "completed"|"current"|"upcoming", "tasks": ["t1"] } ],
  "probability": { "regional": number, "national": number, "international": number }
}`;

      const res = await callGroq([
        { role: "system", content: "You are HackOS AI Jury. Always respond with pure JSON." },
        { role: "user", content: prompt }
      ]);

      const jsonStr = res.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(jsonStr) as AnalysisData;
      setAnalysisData(data);
    } catch (error) {
      console.error("AI Evaluation failed", error);
      // Fallback
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <AIJuryContext.Provider value={{ projectDetails, setProjectDetails, extractedText, setExtractedText, parsedSlides, setParsedSlides, analysisData, setAnalysisData, evaluateProject, isEvaluating }}>
      {children}
    </AIJuryContext.Provider>
  );
};

export const useAIJury = () => {
  const context = useContext(AIJuryContext);
  if (!context) {
    throw new Error("useAIJury must be used within an AIJuryProvider");
  }
  return context;
};
