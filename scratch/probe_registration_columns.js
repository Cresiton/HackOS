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
  console.log("Missing columns:", missing);
}

async function run() {
  // Candidate columns for registrations / hackathon_registrations
  const candidateRegColumns = [
    "id", "hackathon_id", "user_id", "created_at", "updated_at",
    "name", "email", "college", "resume", "resume_url", "skills",
    "experience", "team_name", "answers", "details", "status", "role"
  ];
  
  await testTable("registrations", candidateRegColumns);
  await testTable("hackathon_registrations", candidateRegColumns);
}

run();
