import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOtherTables() {
  const email = `tables2-${Math.random()}@example.com`;
  const password = 'test-password-123456';

  console.log('Signing up user:', email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError);
    return;
  }

  const userId = signUpData.user.id;
  console.log('User ID:', userId);

  await new Promise(r => setTimeout(r, 2000));

  console.log('Inserting profile fallback...');
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      name: 'Test Builder',
      email: email,
      role: 'Full Stack Developer',
      bio: 'Excited to build together!',
      availability: 'available',
      trust_score: 25,
      rating: 5.0,
    })
    .select();
  console.log('Profile insert result:', { profileData, error: profileErr });

  console.log('1. Checking user_education...');
  const { error: eduErr } = await supabase.from('user_education').insert({
    user_id: userId,
    degree: 'B.S.',
    institution: 'Stanford',
    field_of_study: 'CS',
    start_year: '2020',
    end_year: '2024'
  });
  console.log('user_education error:', eduErr);

  console.log('2. Checking user_experience...');
  const { error: expErr } = await supabase.from('user_experience').insert({
    user_id: userId,
    title: 'SWE',
    company: 'Google',
    period: '2024',
    description: 'Coding stuff'
  });
  console.log('user_experience error:', expErr);

  console.log('3. Checking user_projects...');
  const { error: projErr } = await supabase.from('user_projects').insert({
    user_id: userId,
    title: 'Cool Project',
    description: 'Some description',
    tech_stack: ['React', 'Node'],
    github_url: 'https://github.com',
    live_url: 'https://live.com'
  });
  console.log('user_projects error:', projErr);

  console.log('4. Checking user_domains...');
  const { error: domErr } = await supabase.from('user_domains').insert({
    user_id: userId,
    domain: 'Web Development'
  });
  console.log('user_domains error:', domErr);
}

checkOtherTables().catch(console.error);
