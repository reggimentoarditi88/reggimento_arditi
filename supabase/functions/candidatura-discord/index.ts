// Supabase Edge Function (FACOLTATIVA): invia ogni nuova candidatura in un canale Discord dello staff.
// Collegata tramite Database Webhook su INSERT nella tabella "candidature" (vedi GUIDA.md, passo 8).
// Segreti richiesti: DISCORD_WEBHOOK_CANDIDATURE, WEBHOOK_SECRET

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Non autorizzato', { status: 401 });
  }
  const { record: c } = await req.json();
  if (!c) return new Response('Nessun record', { status: 400 });

  const taglia = (s: string | null, n = 1000) => (s ? String(s).slice(0, n) : '—');
  const body = {
    username: 'Reggimento Arditi — Reclutamento',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: `Nuova candidatura: ${taglia(c.discord_nome, 60)}`,
      color: 0x5b6b3a,
      fields: [
        { name: 'Età', value: String(c.eta ?? '—'), inline: true },
        { name: 'Ruolo preferito', value: taglia(c.ruolo_preferito), inline: true },
        { name: 'Disponibilità', value: taglia(c.disponibilita) },
        { name: 'Esperienza', value: taglia(c.esperienza) },
        { name: 'Motivazione', value: taglia(c.motivazione) },
        { name: 'Come ci ha conosciuto', value: taglia(c.provenienza) },
      ],
      timestamp: c.creato_il,
    }],
  };
  const r = await fetch(Deno.env.get('DISCORD_WEBHOOK_CANDIDATURE')!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return new Response(r.ok ? 'ok' : 'errore Discord', { status: r.ok ? 200 : 502 });
});
