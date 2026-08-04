import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
// Server-only file, so the service role key is safe here — and required:
// merchants/entitlements/products have no anon INSERT policies, so with the
// anon key every registration write is silently rejected by RLS.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[emode] SUPABASE_SERVICE_ROLE_KEY not set — merchant registration and product sync will be blocked by RLS."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
