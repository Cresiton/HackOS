import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleProfile() {
  const email = `simple-${Math.random()}@example.com`;
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

  console.log('Inserting simple profile...');
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      name: 'Test Simple',
      email: email,
    })
    .select();
  console.log('Profile insert result:', { profileData, error: profileErr });

  if (!profileErr) {
    console.log('Trying insert into user_education...');
    const { error: eduErr } = await supabase.from('user_education').insert({
      user_id: userId,
      degree: 'B.S.',
      institution: 'Stanford',
      field_of_study: 'CS',
      start_year: '2020',
      end_year: '2024'
    });
    console.log('user_education error:', eduErr);
  }
}

testSimpleProfile().catch(console.error);
