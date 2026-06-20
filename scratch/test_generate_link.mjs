import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function testLink() {
  console.log("=== TESTING GENERATE LINK FOR MAGICLINK ===");
  const email = '1072714771@barberos.app'; // Duva's email

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
    options: {
      redirectTo: 'http://localhost:3000/dashboard/appointments'
    }
  });

  if (error) {
    console.error("Error generating link:", error);
  } else {
    console.log("Success! Link generated:");
    console.log("Action Link:", data.properties?.action_link);
    console.log("Redirect To:", data.properties?.redirect_to);
  }
}

testLink();
