import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vsslcbsdvxbsfivcfxfd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk'
);

const tenantId = "c88f1146-24e5-42bd-9ca7-009772ee83c4";
const idNumber = "12345";

async function run() {
  console.log("=== RUNNING IDENTIFY LOCAL SIMULATION ===");
  
  // 1. Buscar profiles
  console.log("Searching profiles for id_number:", idNumber);
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id_number", idNumber)
    .maybeSingle();

  if (profileErr) console.error("Profile Error:", profileErr);
  console.log("Profile found:", JSON.stringify(profile, null, 2));

  let client = null;

  if (profile) {
    console.log("Searching clients by user_id:", profile.id);
    const { data: tenantClient, error: clientErr } = await supabase
      .from("clients")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (clientErr) console.error("Client by user_id Error:", clientErr);
    console.log("Client by user_id found:", JSON.stringify(tenantClient, null, 2));

    if (tenantClient) {
      client = tenantClient;
    } else {
      console.log("Searching clients by id_number:", idNumber);
      const { data: clientByIdNumber, error: clientByIdNumErr } = await supabase
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id_number", idNumber)
        .maybeSingle();

      if (clientByIdNumErr) console.error("Client by id_number Error:", clientByIdNumErr);
      console.log("Client by id_number found:", JSON.stringify(clientByIdNumber, null, 2));

      if (clientByIdNumber) {
        if (!clientByIdNumber.user_id) {
          console.log("Self-healing: updating user_id to:", profile.id);
          const { data: updatedClient, error: updateError } = await supabase
            .from("clients")
            .update({ user_id: profile.id })
            .eq("id", clientByIdNumber.id)
            .select("*")
            .single();
          
          if (updateError) {
            console.error("ERROR DE AUTO-CURACION:", updateError);
          } else {
            console.log("Auto-curation succeeded! Updated client:", JSON.stringify(updatedClient, null, 2));
          }
          client = updatedClient || clientByIdNumber;
        } else {
          client = clientByIdNumber;
        }
      } else {
        console.log("No client found. Creating new client.");
      }
    }
  }

  if (client) {
    console.log("Final client selected:", JSON.stringify(client, null, 2));
    
    // Fetch appointments
    console.log("Fetching appointments...");
    let query = supabase
      .from("appointments")
      .select("*, service:services(*), staff:tenant_staff(*, profiles(*))")
      .neq("status", "deleted")
      .order("start_time", { ascending: false })
      .limit(10);

    if (client.user_id) {
      query = query.or(`client_id.eq.${client.id},client_id.eq.${client.user_id}`);
    } else {
      query = query.eq("client_id", client.id);
    }

    const { data: history, error: apptErr } = await query;
    if (apptErr) console.error("Appointment query error:", apptErr);
    console.log("Appointments fetched:", JSON.stringify(history, null, 2));
  } else {
    console.log("No client resolved.");
  }
}

run();
