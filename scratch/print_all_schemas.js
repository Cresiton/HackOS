import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = ["teams", "team_members", "notifications", "conversations", "conversation_members", "messages"];

async function run() {
  console.log("Signing up user...");
  const email = `viewer-${Math.random().toString().substring(2, 8)}@example.com`;
  await supabase.auth.signUp({ email, password: "Password123!" });
  await new Promise(r => setTimeout(r, 1000));

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (error) {
      console.log(`Table ${t} read error:`, error.message);
      continue;
    }
    if (data && data.length > 0) {
      console.log(`Table ${t} columns:`, Object.keys(data[0]));
    } else {
      console.log(`Table ${t} has no rows. Trying to get columns from schema...`);
      // Let's do a select of a non-existent column to see the error message which lists all columns in PostgREST!
      const { error: err } = await supabase.from(t).select("non_existent_column_for_schema_inspection").limit(1);
      if (err && err.message) {
        console.log(`Table ${t} columns (from error):`, err.message);
      }
    }
  }
}

run().catch(console.error);
