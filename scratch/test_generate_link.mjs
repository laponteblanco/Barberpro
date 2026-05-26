import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

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
