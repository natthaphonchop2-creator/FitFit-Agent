import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function getSupabaseConfigStatus() {
  return {
    urlConfigured: Boolean(supabaseUrl),
    serviceRoleKeyConfigured: Boolean(supabaseServiceRoleKey)
  };
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
