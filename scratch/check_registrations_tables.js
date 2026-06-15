import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsdaqwttyrwvvkjtljyd.supabase.co';
const supabaseKey = 'sb_publishable_TzXVzrzEWRATj8o5nKeP1Q_dVZ19lll';
const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  "registrations", "registrants", "participants", "hackathon_participants",
  "hackathon_registrations", "event_registrations", "event_participants",
  "signups", "hackathon_signups", "registration", "participant"
];

async function check() {
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.message.includes('Could not find the table') || error.message.includes('schema cache')) {
        // missing
      } else {
        console.log(`Table '${table}' exists but returned error:`, error.message);
      }
    } else {
      console.log(`Table '${table}' exists!`);
    }
  }
}

check().catch(console.error);
