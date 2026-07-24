import type { APIRoute } from 'astro';
import { getSupabaseAnonServerClient } from '../../../../lib/supabase/server';
import { messaggioPrivatoSchema } from '../../../../lib/domain/validation';

export const POST: APIRoute = async ({ params, request }) => {
  const token = params.token;
  if (!token) {
    return new Response(JSON.stringify({ errore: 'link_non_valido' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  let testo: unknown;
  try {
    const corpo = (await request.json()) as { testo?: unknown };
    testo = corpo.testo;
  } catch {
    return new Response(JSON.stringify({ errore: 'richiesta_non_valida' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const risultato = messaggioPrivatoSchema.safeParse(testo);
  if (!risultato.success) {
    return new Response(JSON.stringify({ errore: 'testo_non_valido' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase.rpc('rpc_invia_messaggio', {
    p_token: token,
    p_testo: risultato.data,
  });

  if (error) {
    return new Response(JSON.stringify({ errore: 'errore_interno' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
};
