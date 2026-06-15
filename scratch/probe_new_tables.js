import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable(name) {
  const { data, error } = await supabase.from(name).select("*").limit(1);
  if (error) {
    console.log(`Table ${name} error:`, error.message);
  } else {
    console.log(`Table ${name} exists!`);
  }
}

async function run() {
  await checkTable("team_invitations");
  await checkTable("team_join_requests");
  await checkTable("team_requests");
  await checkTable("notifications");
}

run();
