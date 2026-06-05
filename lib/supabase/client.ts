import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { key, url } = getSupabaseConfig();

  return createBrowserClient<Database>(url, key);
}
