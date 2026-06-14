import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSession() {
  const email = `session-${Math.random()}@example.com`;
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

  console.log('Sign up data:', {
    user: signUpData.user ? { id: signUpData.user.id, email: signUpData.user.email } : null,
    session: signUpData.session ? { access_token: 'present' } : null
  });

  const { data: sessionData } = await supabase.auth.getSession();
  console.log('Current session details:', sessionData.session ? 'authenticated' : 'no session');
}

checkSession().catch(console.error);
