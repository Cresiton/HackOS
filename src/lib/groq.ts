import { GROQ_API_KEYS, GROQ_MODEL, GROQ_API_URL } from "@/constants";

let currentKeyIndex = 0;

function getNextKey(): string {
  const key = GROQ_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
  return key;
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callGroq(
  messages: GroqMessage[],
  retries = 0
): Promise<string> {
  if (retries >= GROQ_API_KEYS.length) {
    throw new Error("All Groq API keys exhausted. Please try again later.");
  }

  const apiKey = getNextKey();

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status;
      
      // Rate limit or quota exhausted - try next key
      if (status === 429 || status === 402 || status === 401) {
        console.warn(`Groq key ${retries + 1} failed (${status}), trying next key...`);
        return callGroq(messages, retries + 1);
      }
      
      throw new Error(`Groq API error: ${status} - ${JSON.stringify(errorData)}`);
    }

    const data: GroqResponse = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      // Network error, try next key
      console.warn(`Network error on key ${retries + 1}, trying next...`);
      return callGroq(messages, retries + 1);
    }
    throw error;
  }
}

export async function analyzeTeamRequirements(
  problemStatement: string,
  teamSize: number,
  hackathon?: string
): Promise<{
  roles: Array<{ role: string; reason: string; priority: "required" | "optional"; skills: string[] }>;
  projectInsights: string;
  techStack: string[];
  challenges: string[];
}> {
  const messages: GroqMessage[] = [
    {
      role: "system",
      content: `You are HackOS AI Team Builder, an expert hackathon team composition advisor. 
Analyze problem statements and suggest optimal team roles and compositions.
Always respond with valid JSON only, no markdown or extra text.`,
    },
    {
      role: "user",
      content: `Analyze this hackathon problem and suggest team composition:

Problem Statement: "${problemStatement}"
Desired Team Size: ${teamSize} members
${hackathon ? `Hackathon: ${hackathon}` : ""}

Respond with JSON in this exact format:
{
  "roles": [
    {
      "role": "Role Name",
      "reason": "Why this role is needed (1-2 sentences)",
      "priority": "required" or "optional",
      "skills": ["skill1", "skill2", "skill3"]
    }
  ],
  "projectInsights": "Brief analysis of the project (2-3 sentences)",
  "techStack": ["technology1", "technology2"],
  "challenges": ["challenge1", "challenge2", "challenge3"]
}

Suggest exactly ${teamSize} roles (mix required and optional). Be specific and practical.`,
    },
  ];

  const response = await callGroq(messages);
  
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback response
    return {
      roles: [
        {
          role: "Full Stack Developer",
          reason: "Core development of the application",
          priority: "required",
          skills: ["React", "Node.js", "PostgreSQL"],
        },
        {
          role: "AI/ML Engineer",
          reason: "AI integration and model development",
          priority: "required",
          skills: ["Python", "TensorFlow", "OpenAI"],
        },
        {
          role: "UI/UX Designer",
          reason: "User interface design and experience",
          priority: "required",
          skills: ["Figma", "UI Design", "Prototyping"],
        },
      ],
      projectInsights: "This project requires a balanced team with strong technical and design capabilities.",
      techStack: ["React", "Node.js", "Python", "PostgreSQL"],
      challenges: ["Complex AI integration", "Real-time data processing", "User experience optimization"],
    };
  }
}

export async function getAIInsight(topic: string, context: string): Promise<string> {
  const messages: GroqMessage[] = [
    {
      role: "system",
      content: "You are HackOS AI assistant. Provide brief, helpful insights for hackathon participants. Keep responses under 100 words.",
    },
    {
      role: "user",
      content: `Provide a helpful insight about: ${topic}\nContext: ${context}`,
    },
  ];

  return callGroq(messages);
}
