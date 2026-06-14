import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateBucket() {
  const email = `bucket-${Math.random()}@example.com`;
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

  console.log('Attempting to create bucket...');
  const { data, error } = await supabase.storage.createBucket('resumes', {
    public: true,
    fileSizeLimit: 5242880, // 5MB
  });

  if (error) {
    console.error('Create bucket error:', error);
  } else {
    console.log('Bucket created successfully:', data);
  }
}

testCreateBucket().catch(console.error);
