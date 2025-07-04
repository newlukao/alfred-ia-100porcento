import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Função para juntar date e time em um Date JS no fuso de Brasília (UTC-3)
function combineDateTimeBR(dateStr: string, timeStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute, second] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, second));
}

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("*");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const now = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const oneHourTenMinLater = new Date(now.getTime() + 70 * 60 * 1000);

  let triggered = 0;

  for (const appointment of appointments || []) {
    if (!appointment.date || !appointment.time) continue;
    const appointmentDate = combineDateTimeBR(appointment.date, appointment.time);

    // LOGS PARA DEBUG
    console.log("now (BR):", now.toISOString());
    console.log("oneHourLater (BR):", oneHourLater.toISOString());
    console.log("oneHourTenMinLater (BR):", oneHourTenMinLater.toISOString());
    console.log("appointmentDate (BR):", appointmentDate.toISOString());

    if (appointmentDate >= oneHourLater && appointmentDate < oneHourTenMinLater) {
      // Log extra: id e title do compromisso
      console.log(`Webhook disparado para agendamento: id=${appointment.id}, title=${appointment.title}`);
      await fetch("https://alfred-100.vercel.app/api/cron-webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment }),
      });
      triggered++;
    }
  }

  return new Response(
    JSON.stringify({ triggered }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}); 