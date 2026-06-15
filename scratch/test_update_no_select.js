import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("1. Signing up user...");
  const email = `test-user-${Math.random().toString().substring(2, 8)}@example.com`;
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
    owner_id: user.id
  };
  const serializedDescription = `Test Hackathon\n\n---METADATA---\n${JSON.stringify(metadata)}`;

  const hackathonPayload = {
    title: "Original Title",
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

  // 3. Try updating only title WITHOUT .select()
  console.log("3. Updating title without .select()...");
  const updateRes = await supabase
    .from("hackathons")
    .update({ title: "Updated Title" })
    .eq("id", hackathon.id);
  console.log("Update response (no select):", updateRes);

  // 4. Select the hackathon again to see if title changed
  console.log("4. Fetching the row...");
  const selectRes = await supabase
    .from("hackathons")
    .select("*")
    .eq("id", hackathon.id);
  console.log("Fetch result:", selectRes);
}

test().catch(console.error);
