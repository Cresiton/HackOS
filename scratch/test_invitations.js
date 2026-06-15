import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Sign up leader
  const emailLeader = `leader-${Math.random()}@example.com`;
  const { data: authLeader } = await supabase.auth.signUp({
    email: emailLeader,
    password: 'Password123!',
  });
  const leaderId = authLeader.user.id;
  await new Promise(r => setTimeout(r, 2000));

  // Get first hackathon
  const { data: hacks } = await supabase.from('hackathons').select('id').limit(1);
  const hackathonId = hacks[0].id;

  // Insert team as leader
  const { data: teams } = await supabase
    .from('teams')
    .insert({
      name: 'Leader Team',
      status: 'recruiting',
      hackathon_id: hackathonId,
    })
    .select();
  
  const teamId = teams[0].id;

  // Create membership for leader
  await supabase.from('team_members').insert({
    team_id: teamId,
    user_id: leaderId,
    role: 'leader'
  });

  // Sign up invitee
  const emailInvitee = `invitee-${Math.random()}@example.com`;
  const { data: authInvitee } = await supabase.auth.signUp({
    email: emailInvitee,
    password: 'Password123!',
  });
  const inviteeId = authInvitee.user.id;
  await new Promise(r => setTimeout(r, 2000));

  // Re-auth as leader to send invite
  await supabase.auth.signInWithPassword({
    email: emailLeader,
    password: 'Password123!',
  });

  // Try to insert invitation
  const { data: invite, error } = await supabase
    .from('team_requests')
    .insert({
      team_id: teamId,
      user_id: inviteeId,
      status: 'pending',
      role: 'Backend Developer',
      direction: 'team_to_user',
      message: 'Join us!'
    })
    .select();
  
  console.log('Invite result:', invite, error);

  // Clean up
  if (invite && invite.length > 0) {
    await supabase.from('team_requests').delete().eq('id', invite[0].id);
  }
  await supabase.from('teams').delete().eq('id', teamId);
}

run().catch(console.error);
