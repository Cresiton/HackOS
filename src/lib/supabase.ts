import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing in environment variables.");
}

export const supabase = createClient(
  supabaseUrl || "https://dsdaqwttyrwvvkjtljyd.supabase.co",
  supabaseAnonKey || "sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
