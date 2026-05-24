const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupInventoryTable() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log("Configurando tabla de inventario...");

  // Intentamos crear la tabla usando SQL a través de rpc o directamente si es posible.
  // Como no tenemos un endpoint de SQL directo, usaremos un truco: 
  // Intentaremos una consulta a 'products' para ver si falla.
  
  const { error: checkError } = await supabase.from('products').select('count').limit(1);
  
  if (checkError && checkError.code === '42P01') {
    console.log("La tabla 'products' no existe. Por favor, ejecuta el siguiente SQL en el SQL Editor de tu Dashboard de Supabase:");
    console.log(`
      CREATE TABLE public.products (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        name                TEXT NOT NULL,
        description         TEXT,
        sku                 TEXT,
        retail_price        NUMERIC(10,2) NOT NULL,
        cost_price          NUMERIC(10,2),
        stock               INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        is_active           BOOLEAN NOT NULL DEFAULT true,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Products tenant isolation" ON public.products
        FOR ALL
        USING (tenant_id = public.current_tenant_id());
    `);
  } else if (checkError) {
    console.error("Otro error detectado:", checkError);
  } else {
    console.log("La tabla 'products' ya existe.");
  }
}

setupInventoryTable();
