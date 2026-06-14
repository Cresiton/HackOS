import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const email = `check-${Math.random()}@example.com`;
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

  // Wait for profile setup
  await new Promise(r => setTimeout(r, 2000));

  // Try to query or insert a dummy row into user_resume
  console.log('Testing insert into user_resume with various fields...');
  const { data: insertResult, error: insertError } = await supabase
    .from('user_resume')
    .insert({
      user_id: userId,
      file_name: 'test_resume.pdf',
      file_url: 'https://example.com/test_resume.pdf',
      file_type: 'pdf',
      uploaded_at: new Date().toISOString()
    })
    .select();

  console.log('Insert result:', { insertResult, error: insertError });
}

checkColumns().catch(console.error);
