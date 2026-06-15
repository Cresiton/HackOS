import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `temp-msg-${Math.random()}@example.com`;
  const { data: auth } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
  });
  const userId = auth.user.id;
  await new Promise(r => setTimeout(r, 2000));

  // Try inserting into messages
  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      sender_id: userId,
      content: 'inspecting messages columns'
    })
    .select();
  
  if (msg && msg.length > 0) {
    console.log('messages columns:', Object.keys(msg[0]));
    await supabase.from('messages').delete().eq('id', msg[0].id);
  } else {
    console.error('Error:', error);
  }
}

run().catch(console.error);
