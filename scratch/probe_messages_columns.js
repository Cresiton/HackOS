import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const candidateColumns = [
    "id", "sender_id", "receiver_id", "hackathon_id", "content",
    "created_at", "updated_at", "read", "team_id", "sender_name",
    "sender_avatar", "team_chat", "team_name"
  ];
  
  const existing = [];
  const missing = [];
  
  for (const col of candidateColumns) {
    const { error } = await supabase.from("messages").select(col).limit(1);
    if (error && (error.message.includes("does not exist") || error.message.includes("Could not find the column"))) {
      missing.push(col);
    } else {
      existing.push(col);
    }
  }
  
  console.log("Existing columns in messages table:", existing);
  console.log("Missing columns in messages table:", missing);
}

run();
