import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `testuser-${Date.now()}@example.com`;
  const password = "Password123!";

  console.log("1. Signing up user:", email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error("Sign up error:", signUpError);
    return;
  }

  const userId = signUpData.user.id;
  console.log("Sign up success! User ID:", userId);

  // Wait for trigger to create profile
  await new Promise((r) => setTimeout(r, 2000));

  console.log("2. Fetching profile immediately after signup...");
  const { data: initialProfile, error: fetchError1 } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  console.log("Initial profile:", initialProfile);

  console.log("3. Updating profile details...");
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      name: "John Doe",
      role: "Lead Engineer",
      location: "San Francisco, CA",
      bio: "An AI enthusiast and open source builder.",
      profile_completed: true
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Update profile error:", updateError);
  } else {
    console.log("Update success!");
  }

  console.log("4. Fetching profile again to verify persistence...");
  const { data: updatedProfile, error: fetchError2 } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (fetchError2) {
    console.error("Fetch profile error:", fetchError2);
  } else {
    console.log("Fetched profile details:", updatedProfile);
  }
}

run().catch(console.error);
