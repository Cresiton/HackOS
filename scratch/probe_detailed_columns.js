import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTable(tableName, candidateColumns) {
  const existing = [];
  const missing = [];
  
  for (const col of candidateColumns) {
    const { error } = await supabase.from(tableName).select(col).limit(1);
    if (error && (error.message.includes("does not exist") || error.message.includes("Could not find the column"))) {
      missing.push(col);
    } else {
      existing.push(col);
    }
  }
  
  console.log(`\nTable ${tableName}:`);
  console.log("Existing columns:", existing);
}

async function run() {
  await testTable("notifications", [
    "id", "user_id", "type", "title", "description", "read", "created_at", "action_url", "action_label"
  ]);
  
  await testTable("team_requests", [
    "id", "team_id", "user_id", "status", "created_at", "role", "message", "sender_id", "receiver_id", "hackathon_id"
  ]);
  
  await testTable("teams", [
    "id", "name", "hackathon_id", "max_members", "progress", "status", "description", "category", "color", "icon", "created_at", "creator_id"
  ]);
  
  await testTable("team_members", [
    "id", "team_id", "user_id", "role", "created_at"
  ]);

  await testTable("conversations", [
    "id", "name", "last_message", "time", "unread", "is_online", "is_team", "avatar_url", "icon", "pinned", "created_at", "user1_id", "user2_id"
  ]);
}

run();
