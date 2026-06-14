import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Fetching column names for table 'hackathons'...");
  const { data, error } = await supabase.rpc("get_hackathons_schema"); // Let's try direct sql or a simple query.
  // If rpc doesn't exist, we can try selecting a non-existent column or querying supabase's API details,
  // or we can select information_schema via a postgrest query if allowed (usually not directly allowed via anon key).
  // Alternatively, let's try to do a dummy insert with an empty object and see the error message which lists missing/required fields or validates fields,
  // or try to fetch data from postgrest /rest/v1/?apikey=anonkey
  
  // Let's do a dummy insert with an empty object to see what fields are rejected or what is returned.
  const { data: insertData, error: insertError } = await supabase.from("hackathons").insert({}).select();
  console.log("Insert response data:", insertData);
  console.log("Insert response error:", insertError);
}

test();
