import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const possibleColumns = [
  "id", "title", "organizer", "description", "image", "mode",
  "prize", "prizeAmount", "tags", "daysLeft", "participants",
  "maxParticipants", "startDate", "endDate", "registrationDeadline",
  "location", "featured", "difficulty", "teamSize", "status"
];

// Let's also check snake_case variations
const possibleSnakeColumns = [
  "id", "title", "organizer", "description", "image", "mode",
  "prize", "prize_amount", "tags", "days_left", "participants",
  "max_participants", "start_date", "end_date", "registration_deadline",
  "location", "featured", "difficulty", "team_size", "status"
];

async function test(columns) {
  console.log("Testing columns:", columns.join(", "));
  const { data, error } = await supabase
    .from("hackathons")
    .select(columns.join(", "))
    .limit(1);
    
  if (error) {
    console.log("Error testing columns:", error.message);
    return error.message;
  } else {
    console.log("Success! All these columns exist!");
    return null;
  }
}

async function run() {
  console.log("--- Testing CamelCase Columns ---");
  await test(possibleColumns);
  console.log("\n--- Testing SnakeCase Columns ---");
  await test(possibleSnakeColumns);
}

run();
