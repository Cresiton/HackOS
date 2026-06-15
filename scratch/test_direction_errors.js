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

    const directions = [
      'join', 'invite', 'inbound', 'outbound', 'request', 'sent', 'received', 
      'to_team', 'to_user', 'incoming', 'outgoing', 'apply', 'invitation', 
      'user', 'team', 'applicant', 'member_request', 'team_invite', 'in', 'out'
    ];
    
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
      
      if (reqError) {
        console.log(`Failed for '${direction}':`, reqError.code, reqError.message);
      } else {
        console.log(`Success! '${direction}' is a valid value.`);
        await supabase.from('team_requests').delete().eq('id', req[0].id);
      }
    }

    // Clean up team
    await supabase.from('teams').delete().eq('id', teamId);
  }
}

run().catch(console.error);
