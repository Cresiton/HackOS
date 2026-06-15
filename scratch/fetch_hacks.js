import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from("hackathons").select("*");
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Hackathons count:", data.length);
    data.forEach(h => {
      console.log(`- ID: ${h.id}, Title: ${h.title}`);
      console.log(`  Description snippet: ${h.description ? h.description.substring(0, 150) : "none"}`);
    });
  }
}

run();
