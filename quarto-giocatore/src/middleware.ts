import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase/server';

const PUBBLICO_SENZA_SESSIONE = new Set(['/admin/login', '/admin/callback']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const supabase = createSupabaseServerClient(context.cookies, context.request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  context.locals.admin = null;

  if (user) {
    // Conferma l'appartenenza ad app_admins tramite RLS (policy admin_read_self):
    // se la riga non è leggibile, l'utente ha una sessione ma non è admin.
    const { data: adminRow } = await supabase
      .from('app_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminRow) {
      context.locals.admin = { userId: user.id, email: user.email ?? '' };
    }
  }

  const isAdminRoute = pathname.startsWith('/admin') && !PUBBLICO_SENZA_SESSIONE.has(pathname);

  if (isAdminRoute && !context.locals.admin) {
    return context.redirect('/admin/login');
  }

  return next();
});
