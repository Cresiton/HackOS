import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const columns = [
  "category",
  "team_size_min",
  "team_size_max",
  "tags",
  "image_url",
  "image",
  "difficulty",
  "featured",
  "participants_count",
  "max_participants"
];

async function test() {
  for (const col of columns) {
    const { error } = await supabase.from("hackathons").select(col).limit(1);
    if (error) {
      console.log(`Column '${col}' does NOT exist. Error:`, error.message);
    } else {
      console.log(`Column '${col}' EXISTS!`);
    }
  }
}

test().catch(console.error);
