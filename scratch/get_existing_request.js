import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('team_requests').select('*').limit(5);
  console.log('team_requests rows:', data, error);
}

run().catch(console.error);
