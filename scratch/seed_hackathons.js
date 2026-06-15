import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FEATURED_HACKATHONS = [
  {
    title: "AI Innovation Challenge",
    organizer: "TechCorp India",
    description: "Build AI solutions for real-world problems. Open to all developers worldwide.",
    mode: "Online",
    prize: "₹1,00,000",
    prize_amount: 100000,
    tags: ["AI", "ML", "Data Science"],
    days_left: 10,
    start_date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    registration_deadline: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(),
    status: "open",
    image_url: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&h=200&fit=crop",
    metadata: {
      tags: ["AI", "ML", "Data Science"],
      location: "Online",
      difficulty: "Intermediate",
      teamSize: "2-4",
      category: "AI & ML",
      team_size_min: 2,
      team_size_max: 4,
      requirements: [
        { id: "fullName", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email Address", type: "email", required: true },
        { id: "college", label: "College / University", type: "text", required: true }
      ]
    }
  },
  {
    title: "Smart India Hackathon 2026",
    organizer: "Government of India",
    description: "National level innovation competition by Govt. of India. Solve real national challenges.",
    mode: "Offline",
    prize: "₹2,00,000",
    prize_amount: 200000,
    tags: ["IoT", "Problem Solving", "Web"],
    days_left: 15,
    start_date: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 13 * 24 * 3600 * 1000).toISOString(),
    registration_deadline: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    status: "open",
    image_url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=200&fit=crop",
    metadata: {
      tags: ["IoT", "Problem Solving", "Web"],
      location: "Delhi, India",
      difficulty: "Advanced",
      teamSize: "4-6",
      category: "Web Dev",
      team_size_min: 4,
      team_size_max: 6,
      requirements: [
        { id: "fullName", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email Address", type: "email", required: true },
        { id: "college", label: "College / University", type: "text", required: true }
      ]
    }
  },
  {
    title: "Sustain & Solve",
    organizer: "GreenTech Foundation",
    description: "Tech for sustainability and climate action. Build solutions that matter for the planet.",
    mode: "Online",
    prize: "₹75,000",
    prize_amount: 75000,
    tags: ["Green Tech", "IoT", "AI"],
    days_left: 8,
    start_date: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
    registration_deadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    status: "open",
    image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=200&fit=crop",
    metadata: {
      tags: ["Green Tech", "IoT", "AI"],
      location: "Online",
      difficulty: "Beginner",
      teamSize: "1-3",
      category: "Sustainability",
      team_size_min: 1,
      team_size_max: 3,
      requirements: [
        { id: "fullName", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email Address", type: "email", required: true }
      ]
    }
  },
  {
    title: "Hack The Future 3.0",
    organizer: "FutureBuilders",
    description: "Build the next generation of web solutions. Frontend-focused mega hackathon.",
    mode: "Hybrid",
    prize: "₹1,50,000",
    prize_amount: 150000,
    tags: ["Web", "Blockchain", "AI"],
    days_left: 12,
    start_date: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    registration_deadline: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
    status: "open",
    image_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=200&fit=crop",
    metadata: {
      tags: ["Web", "Blockchain", "AI"],
      location: "Hybrid",
      difficulty: "Intermediate",
      teamSize: "1-5",
      category: "Web Dev",
      team_size_min: 1,
      team_size_max: 5,
      requirements: [
        { id: "fullName", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email Address", type: "email", required: true }
      ]
    }
  }
];

async function seed() {
  console.log("Checking for existing hackathons...");
  const { count, error: countErr } = await supabase.from("hackathons").select("*", { count: "exact", head: true });
  if (countErr) {
    console.error("Error checking hackathons count:", countErr.message);
    return;
  }

  if (count > 0) {
    console.log(`Already has ${count} hackathons in DB. Skipping seeding.`);
    return;
  }

  console.log("Seeding hackathons into database...");
  for (const h of FEATURED_HACKATHONS) {
    const serializedDescription = `${h.description}\n\n---METADATA---\n${JSON.stringify(h.metadata)}`;
    const { error: insertErr } = await supabase.from("hackathons").insert({
      title: h.title,
      organizer: h.organizer,
      description: serializedDescription,
      mode: h.mode,
      prize: h.prize,
      prize_amount: h.prize_amount,
      days_left: h.days_left,
      start_date: h.start_date,
      end_date: h.end_date,
      registration_deadline: h.registration_deadline,
      status: h.status,
      image_url: h.image_url,
      max_participants: 500,
      participants_count: 0
    });

    if (insertErr) {
      console.error(`Failed to insert "${h.title}":`, insertErr.message);
    } else {
      console.log(`Successfully seeded "${h.title}"!`);
    }
  }
}

seed().catch(console.error);
