import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Client per il browser (isole React admin). Usa esclusivamente la anon key:
// la sicurezza è garantita da RLS e dalle funzioni RPC, non dalla chiave.
export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return browserClient;
}
