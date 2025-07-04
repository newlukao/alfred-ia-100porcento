import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Função utilitária para juntar date e time em um Date (Brasília)
function combineDateTimeBR(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

serve(async (_req) => {
  console.log("[Edge] Iniciando execução do lembrete de compromissos...");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  // Busca todos os agendamentos futuros que ainda não receberam lembrete
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("reminder_sent", false);

  if (error) {
    console.error("[Edge] Erro ao buscar appointments:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`[Edge] Compromissos encontrados: ${appointments?.length || 0}`);

  // Busca todos os webhooks do tipo "compromisso"
  const { data: webhooks, error: webhookError } = await supabase
    .from("webhooks")
    .select("*")
    .eq("type", "compromisso");

  if (webhookError) {
    console.error("[Edge] Erro ao buscar webhooks:", webhookError.message);
    return new Response(JSON.stringify({ error: webhookError.message }), { status: 500 });
  }

  console.log(`[Edge] Webhooks encontrados: ${webhooks?.length || 0}`);

  const now = new Date(new Date().getTime() - 3 * 60 * 60 * 1000); // Horário de Brasília
  let triggered = 0;

  for (const appointment of appointments || []) {
    if (!appointment.date || !appointment.time) continue;
    const appointmentDate = combineDateTimeBR(appointment.date, appointment.time);

    // Se o compromisso é daqui a 1h ou menos, mas ainda não passou, dispara o lembrete
    if (appointmentDate > now && appointmentDate <= new Date(now.getTime() + 60 * 60 * 1000)) {
      for (const webhook of webhooks || []) {
        const payload = {
          id: appointment.id,
          user_id: appointment.user_id,
          title: appointment.title,
          description: appointment.description,
          date: appointment.date,
          time: appointment.time,
          location: appointment.location,
          category: appointment.category,
          created_at: appointment.created_at,
          updated_at: appointment.updated_at
        };
        console.log(`[Edge] Enviando para webhook: ${webhook.url}`);
        console.log(`[Edge] Dados do compromisso:`, payload);
        try {
          const resp = await fetch(webhook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const respText = await resp.text();
          console.log(`[Edge] Resposta do webhook (${webhook.url}):`, resp.status, respText);
        } catch (err) {
          console.error(`[Edge] Erro ao enviar para webhook (${webhook.url}):`, err);
        }
      }
      // Marca como enviado
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ reminder_sent: true })
        .eq("id", appointment.id);
      if (updateError) {
        console.error(`[Edge] Erro ao atualizar reminder_sent para o compromisso ${appointment.id}:`, updateError.message);
      }
      triggered++;
    }
  }

  console.log(`[Edge] Total de lembretes disparados: ${triggered}`);
  return new Response(
    JSON.stringify({ triggered }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}); 