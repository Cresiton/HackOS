import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAuthInsert() {
  const email = `debug-${Math.random()}@example.com`;
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
  console.log('User signed up. ID:', userId);

  // Wait 3 seconds
  await new Promise(r => setTimeout(r, 3000));

  // Verify auth session is active
  const { data: sessionData } = await supabase.auth.getSession();
  console.log('Session user ID:', sessionData.session?.user?.id);

  // Verify profile exists
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  console.log('Profile exists:', !!profile);

  // Try insert into user_education
  console.log('Inserting into user_education...');
  const { data: eduData, error: eduErr } = await supabase.from('user_education').insert({
    user_id: userId,
    degree: 'Bachelor of Computer Science',
    institution: 'IIT Delhi',
    field_of_study: 'CSE',
    start_year: '2021',
    end_year: '2025'
  }).select();

  console.log('Result:', { eduData, error: eduErr });
}

debugAuthInsert().catch(console.error);
