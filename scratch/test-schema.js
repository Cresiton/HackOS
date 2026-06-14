import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const sql = "select column_name, data_type from information_schema.columns where table_name = 'profiles'";
  
  // Try calling exec_sql
  const res1 = await supabase.rpc('exec_sql', { sql });
  console.log("exec_sql response:", JSON.stringify(res1, null, 2));

  // Try calling run_sql
  const res2 = await supabase.rpc('run_sql', { sql });
  console.log("run_sql response:", JSON.stringify(res2, null, 2));
}

run();
