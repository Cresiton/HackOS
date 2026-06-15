import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  // Test select a single row (or empty) to inspect columns of teams
  const { data: teamsData, error: teamsError } = await supabase.from('teams').select('*').limit(1);
  console.log('teams columns:', teamsData ? Object.keys(teamsData[0] || {}) : [], teamsError);

  // Test select team_members
  const { data: membersData, error: membersError } = await supabase.from('team_members').select('*').limit(1);
  console.log('team_members columns:', membersData ? Object.keys(membersData[0] || {}) : [], membersError);

  // Test select team_requests
  const { data: requestsData, error: requestsError } = await supabase.from('team_requests').select('*').limit(1);
  console.log('team_requests columns:', requestsData ? Object.keys(requestsData[0] || {}) : [], requestsError);

  // Test if team_invitations exists
  const { data: inviteData, error: inviteError } = await supabase.from('team_invitations').select('*').limit(1);
  console.log('team_invitations columns:', inviteData ? Object.keys(inviteData[0] || {}) : [], inviteError);

  // Test if team_roles exists
  const { data: rolesData, error: rolesError } = await supabase.from('team_roles').select('*').limit(1);
  console.log('team_roles columns:', rolesData ? Object.keys(rolesData[0] || {}) : [], rolesError);
}

inspect().catch(console.error);
