import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing up user...");
  const email = `viewer-${Math.random().toString().substring(2, 8)}@example.com`;
  await supabase.auth.signUp({ email, password: "Password123!" });
  await new Promise(r => setTimeout(r, 1000));

  const { data, error } = await supabase.from("team_requests").select("*").limit(1);
  if (error) {
    console.error("Error reading team_requests:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("team_requests columns in database:", Object.keys(data[0]));
    console.log("Sample team_request:", data[0]);
  } else {
    // If no rows, try inserting a test row to see error or columns.
    console.log("No team_requests found. Trying dummy insert to check columns...");
    const { data: insData, error: insError } = await supabase.from("team_requests").insert({}).select();
    console.log("Dummy insert result:", { data: insData, error: insError });
  }
}

run().catch(console.error);
