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
      'to_team', 'from_team', 'to_user', 'from_user',
      'user_to_team', 'team_to_user',
      'applicant_to_team', 'team_to_applicant',
      'member_to_team', 'team_to_member',
      'application', 'invitation', 'apply', 'invite',
      'join_request', 'team_invitation', 'join_request', 'team_invite',
      'request', 'invitation', 'request', 'invite',
      'incoming', 'outgoing', 'inbound', 'outbound',
      'incoming_request', 'outgoing_invite', 'inbound_request', 'outbound_invite',
      'in', 'out', 'to', 'from',
      'member_request', 'leader_invite', 'member_apply', 'leader_invite',
      'inward', 'outward', 'request_join', 'invite_member',
      'inflow', 'outflow', 'join', 'invite',
      'send', 'receive', 'sender', 'receiver', 'sent', 'received',
      'team_to_member', 'member_to_team', 'leader_to_member', 'member_to_leader',
      'to_member', 'to_team',
      'user_request', 'team_invite',
      '0', '1', 'true', 'false', 'yes', 'no', 'left', 'right',
      'request_to_join', 'invitation_to_join',
      'request_join', 'invite_user',
      'user_initiated', 'team_initiated',
      'inward_request', 'outward_invite',
      'candidate_to_team', 'team_to_candidate'
    ];
    
    // De-duplicate
    const uniqueDirections = [...new Set(directions)];

    for (const direction of uniqueDirections) {
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
        console.log(`SUCCESS: '${direction}' works!`);
        await supabase.from('team_requests').delete().eq('id', req[0].id);
        break;
      }
    }

    // Clean up team
    await supabase.from('teams').delete().eq('id', teamId);
    console.log('Done testing.');
  }
}

run().catch(console.error);
