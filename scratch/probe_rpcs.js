import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsdaqwttyrwvvkjtljyd.supabase.co";
const supabaseAnonKey = "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidateRPCs = [
  "exec_sql", "run_sql", "execute_sql", "query_sql", "sql", "run_query",
  "execute_query", "db_query", "migrate", "run_migrations", "exec",
  "check_schema", "get_schema", "get_tables", "raw_sql"
];

async function probe() {
  for (const rpcName of candidateRPCs) {
    const { error } = await supabase.rpc(rpcName, { sql: "SELECT 1" });
    if (error) {
      if (error.code === "PGRST202") {
        // Not found
      } else {
        console.log(`RPC '${rpcName}' EXISTS! Error:`, error);
      }
    } else {
      console.log(`RPC '${rpcName}' EXISTS and succeeded!`);
    }
  }
}

probe().catch(console.error);
