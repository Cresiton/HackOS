import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { error: colErr } = await supabase.from("profiles").select("college, experience").limit(1);
  if (colErr) {
    console.log("Error selecting college/experience from profiles:", colErr.message);
  } else {
    console.log("Success! college and experience columns exist in profiles table!");
  }
}

test().catch(console.error);
