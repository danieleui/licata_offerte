import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [inviato, setInviato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrore(null);
    setInvio(true);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/callback`,
      },
    });

    setInvio(false);
    if (error) {
      setErrore('Invio non riuscito. Riprova tra qualche minuto.');
      return;
    }
    setInviato(true);
  }

  if (inviato) {
    return (
      <div className="scheda">
        <p>
          Ti abbiamo inviato un link di accesso a <strong>{email}</strong>.
          Aprilo dal telefono o dal computer con cui hai richiesto l'accesso.
        </p>
      </div>
    );
  }

  return (
    <form className="scheda" onSubmit={handleSubmit}>
      <div className="campo">
        <label htmlFor="email">Email amministratore</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {errore && <p className="errore">{errore}</p>}
      <button className="pulsante pulsante--primario" type="submit" disabled={invio}>
        {invio ? 'Invio in corso…' : 'Invia link di accesso'}
      </button>
    </form>
  );
}
