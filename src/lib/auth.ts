import { User } from "@/types";

const MOCK_USER: User = {
  id: "user_alex_001",
  name: "Alex Singh",
  email: "alex@dev.ai",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex&backgroundColor=b6e3f4",
  role: "Full Stack Developer",
  skills: ["React", "Node.js", "TypeScript", "Python", "PostgreSQL", "Docker"],
  location: "Bangalore, India",
  bio: "Passionate full-stack developer with 3 years of hackathon experience. Love building products that matter.",
  github: "https://github.com/alexsingh",
  linkedin: "https://linkedin.com/in/alexsingh",
  trustScore: 85,
  availability: "available",
  rating: 4.9,
  college: "IIT Bangalore",
  experience: "2 years",
  isOnline: true,
  badges: ["Top Builder", "AI Enthusiast", "3x Winner"],
};

export function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem("hackos_user");
    if (stored) return JSON.parse(stored);
    return null;
  } catch {
    return null;
  }
}

export function storeUser(user: User): void {
  localStorage.setItem("hackos_user", JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem("hackos_user");
  localStorage.removeItem("hackos_token");
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("hackos_user");
}

export async function mockLogin(email: string, password: string): Promise<User> {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1200));
  
  if (!email || !password) {
    throw new Error("Email and password are required");
  }
  
  const user = { ...MOCK_USER, email };
  storeUser(user);
  localStorage.setItem("hackos_token", "mock_jwt_token_" + Date.now());
  return user;
}

export async function mockSignup(name: string, email: string, password: string): Promise<User> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  const user: User = {
    ...MOCK_USER,
    id: "user_" + Date.now(),
    name,
    email,
    trustScore: 25,
    skills: [],
    bio: "",
  };
  
  storeUser(user);
  localStorage.setItem("hackos_token", "mock_jwt_token_" + Date.now());
  return user;
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
