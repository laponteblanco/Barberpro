import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceOwner() {
  const { data: tenants } = await supabase.from('tenants').select('id, name');
  
  for (const tenant of tenants) {
    const { data: staff } = await supabase
      .from('tenant_staff')
      .select('id, role')
      .eq('tenant_id', tenant.id);
      
    const hasOwner = staff.some(s => s.role === 'owner');
    if (!hasOwner && staff.length > 0) {
      console.log(`Tenant ${tenant.name} has no owner. Making first staff member an owner: ${staff[0].id}`);
      await supabase
        .from('tenant_staff')
        .update({ role: 'owner' })
        .eq('id', staff[0].id);
    }
  }
}

forceOwner();
