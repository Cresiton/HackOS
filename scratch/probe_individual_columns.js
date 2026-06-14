import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidateColumns = [
  // camelCase
  "id", "title", "organizer", "description", "image", "mode",
  "prize", "prizeAmount", "tags", "daysLeft", "participants",
  "maxParticipants", "startDate", "endDate", "registrationDeadline",
  "location", "featured", "difficulty", "teamSize", "status",
  // snake_case
  "prize_amount", "days_left", "max_participants", "start_date", "end_date", "registration_deadline",
  "team_size", "image_url", "created_at", "updated_at", "user_id"
];

async function probe() {
  const existing = [];
  const missing = [];
  
  for (const col of candidateColumns) {
    const { error } = await supabase.from("hackathons").select(col).limit(1);
    if (error) {
      // If error mentions that column does not exist, it's missing.
      // Otherwise, if it's another error (like policy violation on select, though select is public), we check.
      if (error.message.includes("does not exist")) {
        missing.push(col);
      } else {
        console.log(`Column ${col} returned unexpected error:`, error.message);
      }
    } else {
      existing.push(col);
    }
  }
  
  console.log("Existing columns:", existing);
  console.log("Missing columns:", missing);
}

probe();
