import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Hackathon } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function deserializeHackathon(dbHack: any): Hackathon {
  if (!dbHack) {
    return {
      id: "",
      title: "",
      organizer: "",
      description: "",
      image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=200&fit=crop",
      mode: "Online",
      prize: "TBD",
      prizeAmount: 0,
      tags: [],
      daysLeft: 7,
      participants: 0,
      maxParticipants: 500,
      startDate: "",
      endDate: "",
      registrationDeadline: "",
      location: "",
      difficulty: "Intermediate",
      teamSize: "2-4",
      status: "open",
      requirements: [
        { id: "fullName", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email Address", type: "email", required: true },
        { id: "college", label: "College / University", type: "text", required: true },
        { id: "resume", label: "Resume (PDF) / Photo", type: "file", required: true }
      ],
      external: false,
      eventLink: "",
      category: "General",
      team_size_min: 1,
      team_size_max: 4,
      customFields: []
    };
  }
  let description = dbHack.description || "";
  let tags: string[] = [];
  let location = "";
  let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = "Intermediate";
  let teamSize = "2-4";
  let requirements = [
    { id: "fullName", label: "Full Name", type: "text", required: true },
    { id: "email", label: "Email Address", type: "email", required: true },
    { id: "college", label: "College / University", type: "text", required: true },
    { id: "resume", label: "Resume (PDF) / Photo", type: "file", required: true }
  ];
  let external = false;
  let eventLink = "";
  let category = "General";
  let team_size_min = 1;
  let team_size_max = 4;
  let customFields: any[] = [];
  
  const parts = description.split(/[\r\n]*---METADATA---[\r\n]*/);
  if (parts.length > 1) {
    description = parts[0];
    try {
      const meta = JSON.parse(parts[1]);
      tags = meta.tags || [];
      location = meta.location || "";
      difficulty = (meta.difficulty as 'Beginner' | 'Intermediate' | 'Advanced') || "Intermediate";
      teamSize = meta.teamSize || "2-4";
      requirements = meta.requirements || requirements;
      external = !!meta.external;
      eventLink = meta.event_link || "";
      category = meta.category || "General";
      customFields = meta.custom_fields || [];
      
      if (meta.team_size_min !== undefined) {
        team_size_min = Number(meta.team_size_min);
      } else if (teamSize) {
        const minVal = parseInt(teamSize.split("-")[0], 10);
        if (!isNaN(minVal)) team_size_min = minVal;
      }
      if (meta.team_size_max !== undefined) {
        team_size_max = Number(meta.team_size_max);
      } else if (teamSize) {
        const rangeParts = teamSize.split("-");
        const maxVal = parseInt(rangeParts[rangeParts.length - 1], 10);
        if (!isNaN(maxVal)) team_size_max = maxVal;
      }
    } catch (e) {
      console.error("Error parsing hackathon metadata:", e);
    }
  } else if (teamSize) {
    const minVal = parseInt(teamSize.split("-")[0], 10);
    if (!isNaN(minVal)) team_size_min = minVal;
    const rangeParts = teamSize.split("-");
    const maxVal = parseInt(rangeParts[rangeParts.length - 1], 10);
    if (!isNaN(maxVal)) team_size_max = maxVal;
  }
  
  return {
    id: dbHack.id,
    title: dbHack.title,
    organizer: dbHack.organizer,
    description: description,
    image: dbHack.image_url || "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=200&fit=crop",
    mode: dbHack.mode || "Online",
    prize: dbHack.prize || "TBD",
    prizeAmount: dbHack.prize_amount || 0,
    tags: tags,
    daysLeft: dbHack.days_left !== undefined ? dbHack.days_left : 7,
    participants: dbHack.participants_count !== undefined ? dbHack.participants_count : 0,
    maxParticipants: dbHack.max_participants || 500,
    startDate: dbHack.start_date?.split("T")[0] || "",
    endDate: dbHack.end_date?.split("T")[0] || "",
    registrationDeadline: dbHack.registration_deadline?.split("T")[0] || "",
    location: location,
    difficulty: difficulty,
    teamSize: teamSize,
    status: dbHack.status || "open",
    requirements: requirements,
    external: external,
    eventLink: eventLink,
    category: category,
    team_size_min: team_size_min,
    team_size_max: team_size_max,
    customFields: customFields
  };
}

