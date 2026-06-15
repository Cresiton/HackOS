import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing up user...");
  const email = `viewer-${Math.random().toString().substring(2, 8)}@example.com`;
  await supabase.auth.signUp({ email, password: "Password123!" });
  await new Promise(r => setTimeout(r, 1000));

  const { data, error } = await supabase.from("hackathons").select("*");
  if (error) {
    console.error("Error reading hackathons:", error.message);
    return;
  }

  console.log(`Found ${data.length} hackathons:`);
  data.forEach((h, idx) => {
    console.log(`\nHackathon ${idx + 1}:`);
    console.log(`- ID: ${h.id}`);
    console.log(`- Title: ${h.title}`);
    console.log(`- Organizer: ${h.organizer}`);
    console.log(`- Description Snippet: ${h.description ? h.description.substring(0, 100) : "none"}`);
    
    const parts = h.description.split("\n\n---METADATA---\n");
    if (parts.length > 1) {
      console.log(`- Metadata:`, parts[1]);
    } else {
      console.log(`- Metadata: NONE`);
    }
  });
}

run().catch(console.error);
