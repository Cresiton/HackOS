import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing up user...");
  const email = `viewer-${Math.random().toString().substring(2, 8)}@example.com`;
  await supabase.auth.signUp({ email, password: "Password123!" });
  await new Promise(r => setTimeout(r, 1000));

  const { data, error } = await supabase.from("hackathons").select("*").limit(1);
  if (error) {
    console.error("Error reading hackathons:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log("Hackathon columns in database:", Object.keys(data[0]));
    console.log("Sample hackathon:", data[0]);
  } else {
    console.log("No hackathons found even after signing up.");
  }
}

run().catch(console.error);
