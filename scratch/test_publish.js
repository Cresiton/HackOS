import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("1. Signing up user...");
  const email = `test-organizer-${Math.random().toString().substring(2, 8)}@example.com`;
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: "Password123!"
  });

  if (signUpError) {
    console.error("Sign up error:", signUpError);
    return;
  }

  const user = signUpData.user;
  console.log("User signed up successfully. User ID:", user.id);

  // Wait for profile trigger
  await new Promise(r => setTimeout(r, 2000));

  // 2. Insert a hackathon
  console.log("2. Inserting hackathon...");
  const metadata = {
    tags: ["Test"],
    location: "Online",
    difficulty: "Intermediate",
    teamSize: "2-4",
    owner_id: user.id,
    requirements: [],
    category: "General",
    team_size_min: 2,
    team_size_max: 4
  };
  const serializedDescription = `Test Hackathon\n\n---METADATA---\n${JSON.stringify(metadata)}`;

  const hackathonPayload = {
    title: "Test Hackathon " + Math.random().toString().substring(2, 6),
    organizer: "Test Organizer",
    description: serializedDescription,
    mode: "Online",
    prize: "₹1,00,000",
    prize_amount: 100000,
    days_left: 7,
    max_participants: 500,
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
    registration_deadline: new Date().toISOString(),
    status: "open",
    image_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=200&fit=crop"
  };

  const { data: insertData, error: insertError } = await supabase
    .from("hackathons")
    .insert(hackathonPayload)
    .select();

  console.log("Insert result:", { data: insertData, error: insertError });

  if (insertError) {
    return;
  }

  const hackathon = insertData[0];
  console.log("Inserted Hackathon ID:", hackathon.id);

  // 3. Update the hackathon
  console.log("3. Updating hackathon...");
  hackathonPayload.title = "Updated Test Hackathon";

  const { data: updateData, error: updateError } = await supabase
    .from("hackathons")
    .update(hackathonPayload)
    .eq("id", hackathon.id)
    .select();

  console.log("Update result:", { data: updateData, error: updateError });
}

test().catch(console.error);
