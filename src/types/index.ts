export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  skills: string[];
  location: string;
  bio: string;
  github?: string;
  linkedin?: string;
  trustScore: number;
  availability: 'available' | 'open' | 'busy' | 'unavailable';
  rating: number;
  matchScore?: number;
  college?: string;
  experience?: string;
  isOnline?: boolean;
  badges?: string[];
  github_username?: string;
  github_avatar?: string;
  github_connected?: boolean;
  github_connected_at?: string;
  linkedin_url?: string;
  linkedin_name?: string;
  linkedin_avatar?: string;
  linkedin_connected?: boolean;
  linkedin_connected_at?: string;
  education?: UserEducation[];
  experiences?: UserExperience[];
  projects?: UserProject[];
  domains?: string[];
}

export interface Hackathon {
  id: string;
  title: string;
  organizer: string;
  description: string;
  image: string;
  mode: 'Online' | 'Offline' | 'Hybrid';
  prize: string;
  prizeAmount: number;
  tags: string[];
  daysLeft: number;
  participants: number;
  maxParticipants?: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  location?: string;
  featured?: boolean;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  teamSize?: string;
  status: 'open' | 'closed' | 'upcoming';
}

export interface Team {
  id: string;
  name: string;
  hackathon: string;
  members: TeamMember[];
  maxMembers: number;
  progress: number;
  status: 'recruiting' | 'ready' | 'active' | 'completed';
  requiredRoles: string[];
  description: string;
  category: string;
  matchScore?: number;
  isOnline?: boolean;
  icon?: string;
  color?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

export interface TeamRequest {
  id: string;
  teamName: string;
  requiredRole: string;
  members: number;
  maxMembers: number;
  location: string;
  matchScore: number;
  isOnline: boolean;
  teamLeader: string;
  hackathon: string;
  color?: string;
  icon?: string;
  avatars?: string[];
  extraMembers?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
  teamChat?: boolean;
  teamName?: string;
}

export interface Notification {
  id: string;
  type: 'team' | 'hackathon' | 'profile' | 'message' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface Teammate {
  id: string;
  name: string;
  role: string;
  location: string;
  skills: string[];
  rating: number;
  matchScore: number;
  isOnline: boolean;
  avatar?: string;
  college?: string;
}

export interface GitHubStats {
  user_id: string;
  github_username: string;
  public_repos: number;
  total_commits: number;
  active_days: number;
  score: number;
  languages: Record<string, number>;
  last_synced: string;
}

export interface UserEducation {
  id?: string;
  user_id?: string;
  degree: string;
  institution: string;
  field_of_study?: string;
  start_year?: string;
  end_year?: string;
}

export interface UserProject {
  id?: string;
  user_id?: string;
  title: string;
  description?: string;
  tech_stack: string[];
  github_url?: string;
  live_url?: string;
}

export interface UserExperience {
  id?: string;
  user_id?: string;
  title: string;
  company: string;
  period?: string;
  description?: string;
}

export interface UserResume {
  id?: string;
  user_id?: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  parsed_at: string;
  status: string;
}
