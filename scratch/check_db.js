import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Checking connection with URL:", supabaseUrl);
  // Try querying hackathons table
  const { data, error } = await supabase.from("hackathons").select("*").limit(1);
  if (error) {
    console.error("Error querying 'hackathons' table:", error);
  } else {
    console.log("Success! Data from 'hackathons' table:", data);
  }
}

test();
