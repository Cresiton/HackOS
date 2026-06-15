import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidateTypes = [
  "message",
  "team_invite",
  "join_request",
  "invite_accepted",
  "team_update",
  "team",
  "invite_rejected",
  "hackathon_registration",
  "general",
  "system",
  "info",
  "alert"
];

async function run() {
  console.log("Signing up user...");
  const email = `viewer-${Math.random().toString().substring(2, 8)}@example.com`;
  const { data: auth } = await supabase.auth.signUp({ email, password: "Password123!" });
  const userId = auth.user.id;
  await new Promise(r => setTimeout(r, 1000));

  for (const t of candidateTypes) {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: t,
        title: "Test Title",
        description: "Test Description"
      })
      .select();
    
    if (error) {
      console.log(`Type '${t}': FAILED. Error:`, error.message);
    } else {
      console.log(`Type '${t}': SUCCESS!`);
      // Delete the test notification
      await supabase.from("notifications").delete().eq("id", data[0].id);
    }
  }
}

run().catch(console.error);
