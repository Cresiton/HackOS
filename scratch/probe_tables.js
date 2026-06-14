import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidateTables = [
  "hackathon_tags",
  "hackathon_skills",
  "registrations",
  "hackathon_registrations",
  "teams",
  "team_members",
  "hackathons",
  "profiles"
];

async function probe() {
  const existing = [];
  const missing = [];
  
  for (const table of candidateTables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error && error.message.includes("relation") && error.message.includes("does not exist")) {
      missing.push(table);
    } else {
      existing.push(table);
    }
  }
  
  console.log("Existing tables:", existing);
  console.log("Missing tables:", missing);
}

probe();
