import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `temp-ins-${Math.random()}@example.com`;
  const { data: auth, error: authError } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
  });
  if (authError) {
    console.error('auth error:', authError);
    return;
  }
  const userId = auth.user.id;
  await new Promise(r => setTimeout(r, 2000));

  // Get first hackathon
  const { data: hacks } = await supabase.from('hackathons').select('id').limit(1);
  const hackathonId = hacks[0].id;

  // Try inserting into teams
  const { data: teams } = await supabase
    .from('teams')
    .insert({
      name: 'Temp Team',
      status: 'recruiting',
      hackathon_id: hackathonId,
    })
    .select();
  
  if (teams && teams.length > 0) {
    const teamId = teams[0].id;

    const directions = ['join', 'invite', 'inbound', 'outbound', 'request', 'sent', 'received', 'to_team', 'to_user', 'incoming', 'outgoing'];
    for (const direction of directions) {
      const { data: req, error: reqError } = await supabase
        .from('team_requests')
        .insert({
          team_id: teamId,
          user_id: userId,
          status: 'pending',
          role: 'Developer',
          direction: direction
        })
        .select();
      
      if (req && req.length > 0) {
        console.log(`Success! direction can be: '${direction}'`);
        console.log('team_requests columns:', Object.keys(req[0]));
        // Clean up request
        await supabase.from('team_requests').delete().eq('id', req[0].id);
      } else {
        // console.log(`Failed for '${direction}':`, reqError.message);
      }
    }

    // Clean up team
    await supabase.from('teams').delete().eq('id', teamId);
  }
}

run().catch(console.error);
