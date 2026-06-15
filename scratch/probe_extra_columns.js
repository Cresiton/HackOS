import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTable(tableName, candidateColumns) {
  const existing = [];
  for (const col of candidateColumns) {
    const { error } = await supabase.from(tableName).select(col).limit(1);
    if (!error || (!error.message.includes("does not exist") && !error.message.includes("Could not find the column"))) {
      existing.push(col);
    }
  }
  console.log(`\nTable ${tableName}:`);
  console.log("Columns:", existing);
}

async function run() {
  const hackathonCols = [
    "id", "title", "organizer", "description", "image", "mode", "prize",
    "prize_amount", "tags", "days_left", "participants", "start_date",
    "end_date", "registration_deadline", "featured", "difficulty",
    "team_size", "status", "created_at", "category", "team_size_min", "team_size_max", "requirements"
  ];
  await testTable("hackathons", hackathonCols);

  const profileCols = [
    "id", "name", "role", "location", "bio", "avatar_url", "github_connected",
    "linkedin_connected", "trust_score", "email", "skills", "github_username", "linkedin_url"
  ];
  await testTable("profiles", profileCols);
}

run().catch(console.error);
