import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidateTables = [
  "notifications",
  "team_requests",
  "requests",
  "invitations",
  "messages",
  "conversations",
  "chats"
];

async function probe() {
  const existing = [];
  const missing = [];
  
  for (const table of candidateTables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("does not exist") || msg.includes("could not find the table") || msg.includes("schema cache")) {
        missing.push(table);
      } else {
        existing.push(table);
      }
    } else {
      existing.push(table);
    }
  }
  
  console.log("Existing tables:", existing);
  console.log("Missing tables:", missing);
}

probe();
