import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTEwNTgsImV4cCI6MjA5NTE2NzA1OH0.LoUSj7j7e5CDU-fBvxUxovqUulkbVrhIgOtVQ2LrGao';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

const adminClient = createClient(url, serviceKey);
const publicClient = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function runTest() {
  const email = 'test_auth_agent@barberos.app';
  const password = 'TestPassword123!';

  console.log("1. Creating temporary test user...");
  // Try to delete first in case it exists
  await adminClient.auth.admin.deleteUser('test_auth_agent@barberos.app').catch(() => {});
  
  const { data: user, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin', full_name: 'Agent Tester' }
  });

  if (createError) {
    console.error("Error creating user:", createError);
    return;
  }
  console.log("User created successfully:", user.user.id);

  console.log("\n2. Attempting to sign in with public client...");
  console.time("signInWithPassword");
  const { data: session, error: signInError } = await publicClient.auth.signInWithPassword({
    email,
    password
  });
  console.timeEnd("signInWithPassword");

  if (signInError) {
    console.error("Sign in failed:", signInError);
  } else {
    console.log("Sign in successful!");
    console.log("Session User:", session.user.id);
  }

  console.log("\n3. Cleaning up temporary test user...");
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.user.id);
  if (deleteError) {
    console.error("Error deleting user:", deleteError);
  } else {
    console.log("User deleted successfully.");
  }
}

runTest();
