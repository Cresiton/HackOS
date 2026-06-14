import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `testuser_${Date.now()}@example.com`;
  const password = "TestPassword123!";
  
  console.log("Signing up temporary user:", email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (signUpError) {
    console.error("SignUp error:", signUpError.message);
    return;
  }
  
  const userId = signUpData.user.id;
  console.log("SignUp successful! User ID:", userId);
  
  // Try inserting a hackathon
  console.log("Attempting to insert a hackathon row...");
  const dummyHack = {
    title: "Test AI Hackathon",
    organizer: "Test Organizer",
    description: "This is a test hackathon description.",
    mode: "Online",
    prize: "$10,000",
    status: "open",
    prize_amount: 10000,
    days_left: 10,
    max_participants: 100,
    start_date: "2026-07-01",
    end_date: "2026-07-03",
    registration_deadline: "2026-06-25",
    image_url: "https://example.com/image.png"
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from("hackathons")
    .insert(dummyHack)
    .select();
    
  if (insertError) {
    console.error("Insert error:", insertError);
  } else {
    console.log("Insert successful! Inserted Row:", insertData);
  }
  
  // Clean up user if possible, or just log out
  await supabase.auth.signOut();
}

run();
