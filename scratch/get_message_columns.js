import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  console.log('messages columns:', data ? Object.keys(data[0] || {}) : [], error);
}

run().catch(console.error);
