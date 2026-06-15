import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing up user...");
  const email = `viewer-${Math.random().toString().substring(2, 8)}@example.com`;
  const { data: auth } = await supabase.auth.signUp({ email, password: "Password123!" });
  const userId = auth.user.id;
  await new Promise(r => setTimeout(r, 1000));

  // Try selecting known columns
  const cols = ["id", "user_id", "type", "title", "description", "action_url", "action_label", "is_read", "created_at"];
  const existing = [];
  for (const c of cols) {
    const { error } = await supabase.from("notifications").select(c).limit(1);
    if (!error) {
      existing.push(c);
    } else {
      console.log(`Column ${c} failed:`, error.message);
    }
  }
  console.log("Existing notifications columns:", existing);
}

run().catch(console.error);
