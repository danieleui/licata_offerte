import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Client SSR con sessione (cookie-based), usato dal middleware e dalle
// pagine /admin/* per sapere chi è loggato. Usa solo la anon key: i
// permessi effettivi arrivano dalle policy RLS lette con auth.uid().
export function createSupabaseServerClient(cookies: AstroCookies, request: Request) {
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        const header = request.headers.get('cookie') ?? '';
        return header
          .split(';')
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .map((part) => {
            const separator = part.indexOf('=');
            const name = separator === -1 ? part : part.slice(0, separator);
            const value = separator === -1 ? '' : part.slice(separator + 1);
            return { name, value: decodeURIComponent(value) };
          });
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, { path: '/', ...options });
        }
      },
    },
  });
}

let anonServerClient: ReturnType<typeof createClient<Database>> | null = null;

// Client senza sessione, per le RPC pubbliche del flusso a token
// (/api/i/[token]/...). Nessuna cookie, nessuna service role key: la
// sicurezza è demandata interamente alle funzioni SECURITY DEFINER.
export function getSupabaseAnonServerClient() {
  if (!anonServerClient) {
    anonServerClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return anonServerClient;
}
