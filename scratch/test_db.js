import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  const email = `test-${Math.random()}@example.com`;
  const password = 'test-password-123456';

  console.log('1. Signing up user:', email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError);
    return;
  }

  const user = signUpData.user;
  console.log('Sign up successful, user ID:', user.id);

  // Wait 2 seconds for fallback triggers to finish creating profiles row
  console.log('Waiting for profiles row creation...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Attempting to select profile...');
  const { data: profile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  console.log('Select profile result:', { profile, error: selectError });

  // If profile doesn't exist, try inserting it
  if (!profile) {
    console.log('Profile row missing, inserting fallback profile...');
    const { data: insertProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name: 'Test User',
        email: email,
      })
      .select()
      .single();
    console.log('Insert result:', { insertProfile, error: insertError });
  }

  console.log('3. Attempting to update linkedin_url...');
  const testUrl = 'https://www.linkedin.com/in/test-profile-url-123';
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update({ linkedin_url: testUrl, linkedin_connected: true })
    .eq('id', user.id)
    .select();

  console.log('Update result:', { updateData, error: updateError });
}

runTest().catch(console.error);
