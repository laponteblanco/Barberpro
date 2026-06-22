import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOwners() {
  console.log("Fetching all tenants...");
  const { data: tenants, error: tenantsError } = await supabase.from('tenants').select('id, name');
  
  if (tenantsError) {
    console.error("Error fetching tenants:", tenantsError);
    return;
  }

  console.log(`Found ${tenants.length} tenants.`);

  for (const tenant of tenants) {
    const { data: staff, error: staffError } = await supabase
      .from('tenant_staff')
      .select('id, role')
      .eq('tenant_id', tenant.id);
      
    if (staffError) {
      console.error(`Error fetching staff for tenant ${tenant.name}:`, staffError);
      continue;
    }
    
    // Si no hay owner en la barbería, convertir al primer admin en owner
    const hasOwner = staff.some(s => s.role === 'owner');
    if (!hasOwner) {
      const admins = staff.filter(s => s.role === 'admin');
      if (admins.length > 0) {
        const firstAdmin = admins[0];
        console.log(`Upgrading admin ${firstAdmin.id} to owner for tenant ${tenant.name}`);
        const { error: updateError } = await supabase
          .from('tenant_staff')
          .update({ role: 'owner' })
          .eq('id', firstAdmin.id);
          
        if (updateError) {
          console.error(`Error updating staff ${firstAdmin.id}:`, updateError);
        } else {
          console.log(`Successfully upgraded ${firstAdmin.id} to owner.`);
        }
      }
    }
  }
  
  console.log("Finished fixing owners.");
}

fixOwners();
