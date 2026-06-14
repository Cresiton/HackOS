import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  const email = `upload-${Math.random()}@example.com`;
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

  console.log('Attempting upload to resumes bucket...');
  const fileData = Buffer.from('hello world');
  const { data, error } = await supabase.storage
    .from('resumes')
    .upload(`${userId}/test.txt`, fileData, {
      contentType: 'text/plain',
      upsert: true
    });

  if (error) {
    console.error('Upload error:', error);
  } else {
    console.log('Upload success:', data);
  }
}

testUpload().catch(console.error);
