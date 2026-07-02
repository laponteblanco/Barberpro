import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testApi() {
  const tenantId = "19a5fa6c-04ec-4b1e-a88d-3f33b82a59e4";
  const staffId = "862e39c9-84e3-42f7-ab8e-85afdbaa7600";
  const date = "2026-06-26";

  // Let's get the list of services for this tenant to see what service we might test
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_id', tenantId);

  console.log("Services:", services?.map(s => ({ id: s.id, name: s.name, duration: s.duration_minutes })));

  // Let's call the API logic directly or simulate it
  // Wait, let's fetch from the local API route by calling the GET function from route.ts!
  // To do that, we can mock NextRequest and params:
  const { GET } = await import("../src/app/api/tenants/[tenantId]/staff/[staffId]/availability/route.ts");
  
  // Test with service duration 30 minutes
  const serviceId = services?.[0]?.id; 
  console.log("Testing availability with service:", services?.[0]?.name, "duration:", services?.[0]?.duration_minutes);

  const url = `http://localhost:3000/api/tenants/${tenantId}/staff/${staffId}/availability?date=${date}&service_ids=${serviceId}`;
  const req = {
    nextUrl: new URL(url),
    headers: new Headers()
  };

  const response = await GET(req, {
    params: Promise.resolve({ tenantId, staffId })
  });

  const resData = await response.json();
  console.log("Availability Response:", JSON.stringify(resData, null, 2));
}

testApi();
