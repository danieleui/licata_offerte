import type { APIRoute } from 'astro';
import { getSupabaseAnonServerClient } from '../../../../lib/supabase/server';

const AZIONI_VALIDE = new Set(['conferma', 'declina', 'rinuncia']);

export const POST: APIRoute = async ({ params, request }) => {
  const token = params.token;
  if (!token) {
    return new Response(JSON.stringify({ errore: 'link_non_valido' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  let azione: unknown;
  try {
    const corpo = (await request.json()) as { azione?: unknown };
    azione = corpo.azione;
  } catch {
    return new Response(JSON.stringify({ errore: 'richiesta_non_valida' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (typeof azione !== 'string' || !AZIONI_VALIDE.has(azione)) {
    return new Response(JSON.stringify({ errore: 'azione_non_valida' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase.rpc('rpc_rispondi_invito', {
    p_token: token,
    p_azione: azione as 'conferma' | 'declina' | 'rinuncia',
  });

  if (error) {
    return new Response(JSON.stringify({ errore: 'errore_interno' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
};
