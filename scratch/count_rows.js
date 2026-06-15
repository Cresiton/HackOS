import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
  "profiles",
  "hackathons",
  "teams",
  "team_members",
  "team_requests",
  "notifications",
  "conversations"
];

async function count() {
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`Table '${table}' query error:`, error.message);
    } else {
      console.log(`Table '${table}' row count:`, count);
    }
  }
}

count().catch(console.error);
