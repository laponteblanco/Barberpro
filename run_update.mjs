import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://azyhppsxmyuawvcmfwmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eWhwcHN4bXl1YXd2Y21md21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwODA5NSwiZXhwIjoyMDkzNjg0MDk1fQ.PY0v0maBwKB5TsQYD1UcXV7R0XyndyeIyTIJUTck6eQ'
);

async function run() {
  console.log("=== RUNNING DATABASE VINCULATION UPDATE ===");
  
  // Link e0cdfbdb-7ff0-4822-ba3d-9d413783a00a (clients.id) to 52857467-33e3-4621-8f5d-752ccdb36ff2 (profiles.id)
  const { data, error } = await supabase
    .from('clients')
    .update({ user_id: '52857467-33e3-4621-8f5d-752ccdb36ff2' })
    .eq('id', 'e0cdfbdb-7ff0-4822-ba3d-9d413783a00a')
    .select();

  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("Update succeeded:", JSON.stringify(data, null, 2));
  }
}

run();
