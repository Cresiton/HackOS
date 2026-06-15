import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: regData, error: regError } = await supabase.from('registrations').select('*').limit(1);
  console.log('registrations query:', { data: regData, error: regError });

  const { data: hRegData, error: hRegError } = await supabase.from('hackathon_registrations').select('*').limit(1);
  console.log('hackathon_registrations query:', { data: hRegData, error: hRegError });

  const { data: hackData, error: hackError } = await supabase.from('hackathons').select('*').limit(1);
  if (hackData && hackData.length > 0) {
    console.log('hackathons columns:', Object.keys(hackData[0]));
    console.log('sample hackathon row:', hackData[0]);
  } else {
    console.log('hackathons query failed or returned no rows:', hackError);
  }
}

run().catch(console.error);
