import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `temp-ins-${Math.random()}@example.com`;
  const { data: auth } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
  });
  const userId = auth.user.id;
  await new Promise(r => setTimeout(r, 2000));

  const { data: hacks } = await supabase.from('hackathons').select('id').limit(1);
  const hackathonId = hacks[0].id;

  const { data: teams } = await supabase
    .from('teams')
    .insert({
      name: 'Temp Team',
      status: 'recruiting',
      hackathon_id: hackathonId,
    })
    .select();
  
  const teamId = teams[0].id;

  const { data: req, error } = await supabase
    .from('team_requests')
    .insert({
      team_id: teamId,
      user_id: userId,
      status: 'pending',
      role: 'Developer',
      direction: 'user_to_team'
    })
    .select();
  
  if (req && req.length > 0) {
    console.log('team_requests columns:', Object.keys(req[0]));
    await supabase.from('team_requests').delete().eq('id', req[0].id);
  } else {
    console.error('Error:', error);
  }

  await supabase.from('teams').delete().eq('id', teamId);
}

run().catch(console.error);
