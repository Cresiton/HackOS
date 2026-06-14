import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const candidateColumns = ["hackathon_id", "tag", "tag_id", "name", "skill_id", "skill"];
  
  for (const col of candidateColumns) {
    const { data, error } = await supabase.from("hackathon_tags").select(col).limit(1);
    console.log(`Column ${col}:`, { data, error: error ? error.message : null });
  }
}

test();
