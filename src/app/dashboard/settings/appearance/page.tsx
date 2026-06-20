import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppearanceClientPage from "./AppearanceClientPage";

export default async function AppearancePage() {
  const { tenantId, user } = await getSession();
  if (!tenantId || !user) redirect("/");

  const adminSupabase = await createAdminClient();
  const { data: tenant } = await (adminSupabase as any)
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  const theme = tenant?.settings?.theme || "dark";

  return <AppearanceClientPage currentTheme={theme} />;
}
