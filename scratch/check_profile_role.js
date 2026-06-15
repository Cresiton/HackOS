import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing up user...");
  const email = `test-user-${Math.random().toString().substring(2, 8)}@example.com`;
  const { data: signUpData } = await supabase.auth.signUp({
    email,
    password: "Password123!"
  });
  const user = signUpData.user;
  console.log("User ID:", user.id);

  // Wait for profile trigger
  await new Promise(r => setTimeout(r, 2000));

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  console.log("Profile row created by trigger:", profile);
}

run().catch(console.error);
