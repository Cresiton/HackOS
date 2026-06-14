import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const email = `check2-${Math.random()}@example.com`;
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
  console.log('User signed up successfully. ID:', userId);

  await new Promise(r => setTimeout(r, 2000));

  console.log('Testing insert with original columns...');
  const { data: insertResult, error: insertError } = await supabase
    .from('user_resume')
    .insert({
      user_id: userId,
      file_name: 'test_resume.pdf',
      file_size: 1024,
      uploaded_at: new Date().toISOString(),
      parsed_at: new Date().toISOString(),
      status: 'success'
    })
    .select();

  if (insertError) {
    console.error('Insert error:', insertError);
  } else {
    console.log('Insert success! Inserted row:', insertResult);
  }
}

checkColumns().catch(console.error);
