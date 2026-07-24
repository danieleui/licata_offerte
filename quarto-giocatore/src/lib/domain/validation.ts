import { z } from 'zod';

// Specchiano i vincoli CHECK del database (difesa in profondità: qui si
// valida per dare feedback immediato in UI, il database resta la fonte di
// verità finale).

const livelloSchema = z
  .number()
  .min(1)
  .max(5)
  .refine((v) => Math.round(v * 2) === v * 2, 'Il livello deve avere incrementi di 0,5');

export const giocatoreSchema = z.object({
  nome: z.string().trim().min(1, 'Il nome è obbligatorio').max(100),
  cognome: z.string().trim().min(1, 'Il cognome è obbligatorio').max(100),
  telefono: z.string().trim().min(1, 'Il telefono è obbligatorio').max(30),
  sesso: z.enum(['M', 'F', 'Altro']),
  anno_nascita: z
    .number()
    .int()
    .min(1930)
    .max(new Date().getFullYear()),
  fascia_eta: z.string().trim().max(50).nullable(),
  livello: livelloSchema,
  lato_preferito: z.enum(['sinistra', 'destra', 'indifferente']),
  affidabilita: z.number().int().min(1).max(5).nullable(),
  note_private: z.string().trim().max(2000).nullable(),
  attivo: z.boolean(),
});

export type GiocatoreForm = z.infer<typeof giocatoreSchema>;

export const partitaSchema = z
  .object({
    data: z.string().min(1, 'La data è obbligatoria'),
    ora_inizio: z.string().min(1, "L'ora di inizio è obbligatoria"),
    ora_fine: z.string().min(1, "L'ora di fine è obbligatoria"),
    circolo: z.string().trim().min(1, 'Il circolo è obbligatorio').max(200),
    indirizzo: z.string().trim().min(1, "L'indirizzo è obbligatorio").max(300),
    numero_campo: z.string().trim().max(20).nullable(),
    costo: z.number().min(0).nullable(),
    sesso_richiesto: z.enum(['M', 'F', 'Misto', 'Qualsiasi']),
    fascia_eta: z.string().trim().max(50).nullable(),
    livello_min: livelloSchema.nullable(),
    livello_max: livelloSchema.nullable(),
    note: z.string().trim().max(2000).nullable(),
  })
  .refine((dati) => dati.ora_fine > dati.ora_inizio, {
    message: "L'ora di fine deve essere successiva all'ora di inizio",
    path: ['ora_fine'],
  })
  .refine(
    (dati) => dati.livello_min === null || dati.livello_max === null || dati.livello_min <= dati.livello_max,
    { message: 'Il livello minimo non può superare il livello massimo', path: ['livello_max'] },
  );

export type PartitaForm = z.infer<typeof partitaSchema>;

export const motivoAnnullamentoSchema = z
  .string()
  .trim()
  .min(1, 'Il motivo di annullamento è obbligatorio')
  .max(500);

export const messaggioPrivatoSchema = z
  .string()
  .trim()
  .min(1, 'Scrivi qualcosa prima di inviare')
  .max(2000);
